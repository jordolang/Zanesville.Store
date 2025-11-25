import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { compareTwoStrings } from "string-similarity";

const prisma = new PrismaClient();

const DEFAULT_IMAGE = "/images/products/placeholder.png";
const INVENTORY_PATH =
  process.env.FACEBOOK_INVENTORY_PATH ??
  path.resolve(process.cwd(), "Zanesville-store-lists/facebook_inventory_detailed.csv");
const JSON_PRODUCTS_DIR = path.resolve(process.cwd(), "public/images/products");

type InventoryRow = {
  fb_sku?: string;
  title?: string;
  description?: string;
  category_internal?: string;
  " "?: string;
  price?: string;
  quantity?: string;
  condition?: string;
  brand?: string;
  mpn?: string;
  cost?: string;
  msrp?: string;
  discount_pct?: string;
  projected_profit?: string;
  image_url?: string;
  additional_images?: string;
  tags?: string;
  invoice_number?: string;
  stock_number?: string;
};

type AmazonProductData = {
  product: {
    name?: string;
    brand?: string;
    price?: string;
    rating?: string;
    reviews_count?: string;
    description?: string;
    bullet_points?: string;
    features?: string[];
    images?: string[];
    specifications?: Record<string, any>;
    availability?: string;
    url?: string;
  };
  metadata?: {
    extraction_successful?: boolean;
    error_message?: string | null;
  };
};

const slugify = (value: string, fallback = "item") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || fallback;

const parsePrice = (...values: (string | undefined)[]) => {
  for (const value of values) {
    if (!value) continue;
    const normalized = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }
  return null;
};

const toImages = (value?: string) => {
  if (!value) return [];
  return value
    .split(/[,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const buildDescription = (row: InventoryRow, amazonData?: AmazonProductData) => {
  // Prefer Amazon description if available and CSV description is minimal
  if (amazonData?.product?.description) {
    const csvDesc = row.description?.trim() || "";
    // If CSV description is very short or generic, use Amazon description
    if (csvDesc.length < 100 || csvDesc.includes("Category:") || csvDesc.includes("Condition:")) {
      return amazonData.product.description;
    }
  }

  // Otherwise, build from CSV as before
  const details: string[] = [];
  if (row.description) {
    details.push(row.description.trim());
  }
  if (row.brand) {
    details.push(`Brand: ${row.brand.trim()}`);
  }
  if (row.condition) {
    details.push(`Condition: ${row.condition.trim()}`);
  }
  if (row.tags) {
    details.push(`Tags: ${row.tags.trim()}`);
  }
  if (row.invoice_number || row.stock_number) {
    details.push(
      `Inventory IDs: ${[row.invoice_number, row.stock_number].filter(Boolean).join(" / ")}`
    );
  }
  return details.join("\n");
};

const loadAmazonProductsData = (): Map<string, { asin: string; data: AmazonProductData }> => {
  const amazonProducts = new Map<string, { asin: string; data: AmazonProductData }>();
  
  if (!fs.existsSync(JSON_PRODUCTS_DIR)) {
    console.warn(`Amazon products directory not found: ${JSON_PRODUCTS_DIR}`);
    return amazonProducts;
  }

  const jsonFiles = fs.readdirSync(JSON_PRODUCTS_DIR).filter((file) => file.endsWith(".json"));
  
  console.log(`Loading ${jsonFiles.length} Amazon product JSON files...`);
  
  for (const file of jsonFiles) {
    try {
      const asin = path.basename(file, ".json");
      const filePath = path.join(JSON_PRODUCTS_DIR, file);
      const content = fs.readFileSync(filePath, "utf8");
      const data: AmazonProductData = JSON.parse(content);
      
      if (data.product?.name) {
        const normalizedName = normalizeTitle(data.product.name);
        amazonProducts.set(normalizedName, { asin, data });
      }
    } catch (error) {
      console.warn(`Failed to load ${file}:`, error);
    }
  }
  
  console.log(`Successfully loaded ${amazonProducts.size} Amazon products`);
  return amazonProducts;
};

const findBestMatch = (
  title: string,
  amazonProducts: Map<string, { asin: string; data: AmazonProductData }>
): { asin: string; data: AmazonProductData; similarity: number } | null => {
  const normalizedTitle = normalizeTitle(title);
  let bestMatch: { asin: string; data: AmazonProductData; similarity: number } | null = null;
  let bestScore = 0;

  // Extract key words from title (ignore common words)
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'for', 'to', 'of', 'on', 'at', 'from', 'by', 'new', 'open', 'box']);
  const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  for (const [amazonTitle, productInfo] of amazonProducts.entries()) {
    // Try full string comparison first
    let similarity = compareTwoStrings(normalizedTitle, amazonTitle);
    
    // Also check if key words from CSV title appear in Amazon title
    if (similarity < 0.7 && titleWords.length > 0) {
      const amazonWords = amazonTitle.split(/\s+/);
      const matchingWords = titleWords.filter(word => 
        amazonWords.some(aw => aw.includes(word) || word.includes(aw))
      );
      const wordMatchRatio = matchingWords.length / titleWords.length;
      
      // Boost score if significant word overlap
      if (wordMatchRatio > 0.5) {
        similarity = Math.max(similarity, wordMatchRatio * 0.85);
      }
    }
    
    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = { ...productInfo, similarity };
    }
  }

  // Only return match if similarity is above 65% threshold (lowered for better matching)
  if (bestMatch && bestScore >= 0.65) {
    return bestMatch;
  }

  return null;
};

const mergeImages = (
  csvImageUrl?: string,
  csvAdditionalImages?: string,
  amazonImages?: string[]
): { thumbnails: string[]; previews: string[] } => {
  const allImages = new Set<string>();

  // Add Amazon images first (higher quality)
  if (amazonImages && amazonImages.length > 0) {
    amazonImages.forEach((img) => allImages.add(img));
  }

  // Add CSV images as supplementary
  const csvImages = toImages(csvImageUrl);
  csvImages.forEach((img) => allImages.add(img));

  const additionalImages = toImages(csvAdditionalImages);
  additionalImages.forEach((img) => allImages.add(img));

  const uniqueImages = Array.from(allImages).filter((img) => img && img !== DEFAULT_IMAGE);

  if (uniqueImages.length === 0) {
    return {
      thumbnails: [DEFAULT_IMAGE],
      previews: [DEFAULT_IMAGE],
    };
  }

  return {
    thumbnails: uniqueImages.slice(0, 4), // First 4 for thumbnails
    previews: uniqueImages, // All images for preview gallery
  };
};

async function main() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    throw new Error(`Inventory file not found at ${INVENTORY_PATH}`);
  }

  console.log("Loading inventory CSV...");
  const csvInput = fs.readFileSync(INVENTORY_PATH, "utf8");
  const rows: InventoryRow[] = parse(csvInput, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  });

  console.log(`Loaded ${rows.length} products from CSV`);

  // Load Amazon product data
  const amazonProducts = loadAmazonProductsData();

  await prisma.$transaction([prisma.product.deleteMany(), prisma.category.deleteMany()]);

  const categoryCache = new Map<string, number>();
  let created = 0;
  let matched = 0;
  let unmatched = 0;
  const slugTracker = new Set<string>();
  const unmatchedProducts: string[] = [];

  for (const [index, row] of rows.entries()) {
    const title = row.title?.trim();
    if (!title) continue;

    // Try to find matching Amazon product
    const amazonMatch = findBestMatch(title, amazonProducts);
    
    if (amazonMatch) {
      matched++;
      console.log(
        `✓ Matched "${title}" with Amazon product (${(amazonMatch.similarity * 100).toFixed(1)}% similarity)`
      );
    } else {
      unmatched++;
      unmatchedProducts.push(title);
    }

    const categoryName = row.category_internal?.trim() || "Miscellaneous";
    const categorySlug = slugify(categoryName, "uncategorized");

    let categoryId = categoryCache.get(categorySlug);
    if (!categoryId) {
      const category = await prisma.category.create({
        data: {
          name: categoryName,
          slug: categorySlug,
        },
      });
      categoryId = category.id;
      categoryCache.set(categorySlug, categoryId);
    }

    const baseSlugSource = row.fb_sku?.trim() || `${title}-${index}`;
    const baseSlug = slugify(baseSlugSource, `product-${index}`);
    let slug = baseSlug;
    let dedupe = 1;
    while (slugTracker.has(slug)) {
      slug = `${baseSlug}-${dedupe++}`;
    }
    slugTracker.add(slug);

    // Merge pricing: CSV price is authoritative
    const msrp = parsePrice(row.msrp, row.price);
    const salePrice = parsePrice(row.price, row.cost, row.discount_pct);
    const priceDecimal = new Decimal((msrp ?? salePrice ?? 0).toFixed(2));
    const discountedDecimal = salePrice
      ? new Decimal(salePrice.toFixed(2))
      : priceDecimal;

    // Merge images
    const imageSet = mergeImages(
      row.image_url,
      row.additional_images,
      amazonMatch?.data.product.images
    );

    // Use Amazon reviews count or calculate from quantity
    const reviewsCount = amazonMatch?.data.product.reviews_count
      ? parseInt(amazonMatch.data.product.reviews_count.replace(/,/g, ""))
      : Math.max(1, Math.round((Number(row.quantity) || 1) * 2));

    // Get rating from Amazon
    const rating = amazonMatch?.data.product.rating
      ? new Decimal(parseFloat(amazonMatch.data.product.rating))
      : null;

    // Get brand (prefer Amazon, fallback to CSV)
    const brand = amazonMatch?.data.product.brand || row.brand?.trim() || null;

    // Get features from Amazon
    const features = amazonMatch?.data.product.features || null;

    // Build description
    const description = buildDescription(row, amazonMatch?.data);

    await prisma.product.create({
      data: {
        title,
        slug,
        description,
        reviews: reviewsCount,
        rating,
        brand,
        asin: amazonMatch?.asin || null,
        features,
        price: priceDecimal,
        discountedPrice: discountedDecimal,
        thumbnailUrls: imageSet.thumbnails,
        previewUrls: imageSet.previews,
        categoryId,
      },
    });

    created += 1;
  }

  console.log("\n=== Import Summary ===");
  console.log(`Total products imported: ${created}`);
  console.log(`Matched with Amazon data: ${matched}`);
  console.log(`No Amazon match found: ${unmatched}`);
  
  if (unmatchedProducts.length > 0) {
    console.log("\nUnmatched products (using CSV data only):");
    unmatchedProducts.slice(0, 10).forEach((title) => console.log(`  - ${title}`));
    if (unmatchedProducts.length > 10) {
      console.log(`  ... and ${unmatchedProducts.length - 10} more`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
