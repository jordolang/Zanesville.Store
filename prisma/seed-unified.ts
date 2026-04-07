import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { compareTwoStrings } from "string-similarity";

const prisma = new PrismaClient();

const DEFAULT_IMAGE = "/images/products/placeholder.png";

const LISTS_DIR = path.resolve(process.cwd(), "Zanesville-store-lists");
const FACEBOOK_CSV = path.join(LISTS_DIR, "facebook_inventory_detailed.csv");
const SHOPIFY_CSV = path.join(LISTS_DIR, "shopify_inventory_detailed.csv");
const AUCTION_CSV = path.join(LISTS_DIR, "auction_inventory_compiled.csv");
const JSON_PRODUCTS_DIR = path.resolve(process.cwd(), "public/images/products");

// ── Types ──────────────────────────────────────────────────────────────

type FacebookRow = {
  fb_sku: string;
  title: string;
  description: string;
  category_internal: string;
  " ": string;
  price: string;
  quantity: string;
  condition: string;
  brand: string;
  mpn: string;
  cost: string;
  msrp: string;
  discount_pct: string;
  projected_profit: string;
  image_url: string;
  additional_images: string;
  tags: string;
  invoice_number: string;
  stock_number: string;
};

type ShopifyRow = {
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Vendor: string;
  "Product Category": string;
  Type: string;
  Tags: string;
  Published: string;
  "Variant SKU": string;
  "Variant Inventory Qty": string;
  "Variant Price": string;
  "Variant Compare At Price": string;
  "Variant Cost": string;
  "Image Src": string;
  "Image Position": string;
  "SEO Title": string;
  "SEO Description": string;
};

type AuctionRow = {
  sku: string;
  invoice_number: string;
  invoice_date_parsed: string;
  item_number: string;
  item_title: string;
  category: string;
  qty: string;
  bid_amount: string;
  msrp: string;
  bid_to_msrp_ratio: string;
  discount_pct: string;
  line_cost: string;
  projected_sale_price_per_unit: string;
  projected_revenue: string;
  projected_profit: string;
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
    specifications?: Record<string, unknown>;
    availability?: string;
    url?: string;
  };
  metadata?: {
    extraction_successful?: boolean;
    error_message?: string | null;
  };
};

type MergedProduct = {
  sku: string;
  title: string;
  description: string;
  category: string;
  price: number;
  msrp: number | null;
  cost: number | null;
  brand: string | null;
  condition: string | null;
  quantity: number;
  imageUrl: string | null;
  additionalImages: string[];
  tags: string;
  invoiceNumber: string | null;
  stockNumber: string | null;
  auctionMetadata: {
    bidAmount: number | null;
    lineCost: number | null;
    bidToMsrpRatio: number | null;
    discountPct: number | null;
    projectedProfit: number | null;
    invoiceDate: string | null;
  } | null;
  shopifyMetadata: {
    handle: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    htmlBody: string | null;
    vendor: string | null;
    comparePriceAt: number | null;
  } | null;
};

// ── Utilities ──────────────────────────────────────────────────────────

const slugify = (value: string, fallback = "item"): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || fallback;

const parseNumber = (value: string | undefined | null): number | null => {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const toImageList = (value: string | undefined | null): string[] => {
  if (!value) return [];
  return value
    .split(/[,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const stripHtml = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const normalizeTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// ── CSV Loading ────────────────────────────────────────────────────────

const loadCsv = <T>(filePath: string, label: string): T[] => {
  if (!fs.existsSync(filePath)) {
    console.warn(`${label} file not found: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, "utf8");
  const rows: T[] = parse(content, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  });
  console.log(`Loaded ${rows.length} rows from ${label}`);
  return rows;
};

const buildFacebookMap = (rows: FacebookRow[]): Map<string, FacebookRow> => {
  const map = new Map<string, FacebookRow>();
  for (const row of rows) {
    const sku = row.fb_sku?.trim();
    if (sku && !map.has(sku)) {
      map.set(sku, row);
    }
  }
  return map;
};

const buildShopifyMap = (rows: ShopifyRow[]): Map<string, ShopifyRow> => {
  const map = new Map<string, ShopifyRow>();
  for (const row of rows) {
    const sku = row["Variant SKU"]?.trim();
    if (sku && !map.has(sku)) {
      map.set(sku, row);
    }
  }
  return map;
};

const buildAuctionMap = (rows: AuctionRow[]): Map<string, AuctionRow> => {
  const map = new Map<string, AuctionRow>();
  for (const row of rows) {
    const sku = row.sku?.trim();
    if (sku && !map.has(sku)) {
      map.set(sku, row);
    }
  }
  return map;
};

// ── Amazon Data Loading ────────────────────────────────────────────────

const loadAmazonProducts = (): Map<string, { asin: string; data: AmazonProductData }> => {
  const products = new Map<string, { asin: string; data: AmazonProductData }>();

  if (!fs.existsSync(JSON_PRODUCTS_DIR)) {
    console.warn(`Amazon products directory not found: ${JSON_PRODUCTS_DIR}`);
    return products;
  }

  const jsonFiles = fs.readdirSync(JSON_PRODUCTS_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Loading ${jsonFiles.length} Amazon product JSON files...`);

  for (const file of jsonFiles) {
    try {
      const asin = path.basename(file, ".json");
      const filePath = path.join(JSON_PRODUCTS_DIR, file);
      const content = fs.readFileSync(filePath, "utf8");
      const data: AmazonProductData = JSON.parse(content);

      if (data.product?.name) {
        products.set(normalizeTitle(data.product.name), { asin, data });
      }
    } catch {
      // Skip malformed files silently
    }
  }

  console.log(`Successfully loaded ${products.size} Amazon products`);
  return products;
};

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "with", "for", "to",
  "of", "on", "at", "from", "by", "new", "open", "box",
]);

const findAmazonMatch = (
  title: string,
  amazonProducts: Map<string, { asin: string; data: AmazonProductData }>
): { asin: string; data: AmazonProductData; similarity: number } | null => {
  const normalized = normalizeTitle(title);
  const titleWords = normalized.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  let bestMatch: { asin: string; data: AmazonProductData; similarity: number } | null = null;
  let bestScore = 0;

  for (const [amazonTitle, productInfo] of amazonProducts.entries()) {
    let similarity = compareTwoStrings(normalized, amazonTitle);

    if (similarity < 0.7 && titleWords.length > 0) {
      const amazonWords = amazonTitle.split(/\s+/);
      const matchingWords = titleWords.filter((word) =>
        amazonWords.some((aw) => aw.includes(word) || word.includes(aw))
      );
      const wordMatchRatio = matchingWords.length / titleWords.length;
      if (wordMatchRatio > 0.5) {
        similarity = Math.max(similarity, wordMatchRatio * 0.85);
      }
    }

    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = { ...productInfo, similarity };
    }
  }

  return bestMatch && bestScore >= 0.65 ? bestMatch : null;
};

// ── Merge Logic ────────────────────────────────────────────────────────

const mergeProducts = (
  facebookMap: Map<string, FacebookRow>,
  shopifyMap: Map<string, ShopifyRow>,
  auctionMap: Map<string, AuctionRow>
): MergedProduct[] => {
  const allSkus = new Set([
    ...facebookMap.keys(),
    ...shopifyMap.keys(),
    ...auctionMap.keys(),
  ]);

  const merged: MergedProduct[] = [];

  for (const sku of allSkus) {
    const fb = facebookMap.get(sku);
    const shopify = shopifyMap.get(sku);
    const auction = auctionMap.get(sku);

    // Title: Shopify > Facebook > Auction
    const title =
      shopify?.Title?.trim() ||
      fb?.title?.trim() ||
      auction?.item_title?.trim() ||
      "";

    if (!title) continue;

    // Description: Shopify HTML (stripped) > Facebook > fallback
    const description = shopify?.["Body (HTML)"]
      ? stripHtml(shopify["Body (HTML)"])
      : fb?.description?.trim() || "";

    // Category: Facebook category_internal is most granular
    const category =
      fb?.category_internal?.trim() ||
      shopify?.Type?.trim() ||
      auction?.category?.trim() ||
      "Miscellaneous";

    // Price: Shopify variant price > Facebook price
    const price =
      parseNumber(shopify?.["Variant Price"]) ??
      parseNumber(fb?.price) ??
      parseNumber(auction?.projected_sale_price_per_unit) ??
      0;

    // MSRP: Shopify compare-at > Facebook msrp > Auction msrp
    const msrp =
      parseNumber(shopify?.["Variant Compare At Price"]) ??
      parseNumber(fb?.msrp) ??
      parseNumber(auction?.msrp);

    // Cost: Shopify variant cost > Facebook cost > Auction line_cost
    const cost =
      parseNumber(shopify?.["Variant Cost"]) ??
      parseNumber(fb?.cost) ??
      parseNumber(auction?.line_cost);

    // Brand: Shopify vendor > Facebook brand
    const brand =
      shopify?.Vendor?.trim() ||
      fb?.brand?.trim() ||
      null;

    // Condition: from Facebook
    const condition = fb?.condition?.trim() || null;

    // Quantity
    const quantity =
      parseNumber(shopify?.["Variant Inventory Qty"]) ??
      parseNumber(fb?.quantity) ??
      parseNumber(auction?.qty) ??
      1;

    // Images: merge Shopify + Facebook
    const shopifyImage = shopify?.["Image Src"]?.trim() || null;
    const fbImage = fb?.image_url?.trim() || null;
    const imageUrl = shopifyImage || fbImage;
    const additionalImages = toImageList(fb?.additional_images);
    if (shopifyImage && fbImage && shopifyImage !== fbImage) {
      additionalImages.push(fbImage);
    }

    // Tags
    const tags =
      shopify?.Tags?.trim() ||
      fb?.tags?.trim() ||
      "";

    // Invoice/stock
    const invoiceNumber = fb?.invoice_number?.trim() || auction?.invoice_number?.trim() || null;
    const stockNumber = fb?.stock_number?.trim() || null;

    // Auction business metadata
    const auctionMetadata = auction
      ? {
          bidAmount: parseNumber(auction.bid_amount),
          lineCost: parseNumber(auction.line_cost),
          bidToMsrpRatio: parseNumber(auction.bid_to_msrp_ratio),
          discountPct: parseNumber(auction.discount_pct),
          projectedProfit: parseNumber(auction.projected_profit),
          invoiceDate: auction.invoice_date_parsed?.trim() || null,
        }
      : null;

    // Shopify SEO metadata
    const shopifyMetadata = shopify
      ? {
          handle: shopify.Handle?.trim() || null,
          seoTitle: shopify["SEO Title"]?.trim() || null,
          seoDescription: shopify["SEO Description"]?.trim() || null,
          htmlBody: shopify["Body (HTML)"]?.trim() || null,
          vendor: shopify.Vendor?.trim() || null,
          comparePriceAt: parseNumber(shopify["Variant Compare At Price"]),
        }
      : null;

    merged.push({
      sku,
      title,
      description,
      category,
      price,
      msrp,
      cost,
      brand,
      condition,
      quantity,
      imageUrl,
      additionalImages,
      tags,
      invoiceNumber,
      stockNumber,
      auctionMetadata,
      shopifyMetadata,
    });
  }

  return merged;
};

// ── Image Merging with Amazon ──────────────────────────────────────────

const mergeImages = (
  primaryUrl: string | null,
  additionalUrls: string[],
  amazonImages?: string[]
): { thumbnails: string[]; previews: string[] } => {
  const allImages = new Set<string>();

  // Amazon images first (highest quality)
  if (amazonImages) {
    for (const img of amazonImages) {
      allImages.add(img);
    }
  }

  // Then primary image
  if (primaryUrl) {
    allImages.add(primaryUrl);
  }

  // Then additional
  for (const img of additionalUrls) {
    allImages.add(img);
  }

  const unique = Array.from(allImages).filter((img) => img && img !== DEFAULT_IMAGE);

  if (unique.length === 0) {
    return { thumbnails: [DEFAULT_IMAGE], previews: [DEFAULT_IMAGE] };
  }

  return {
    thumbnails: unique.slice(0, 4),
    previews: unique,
  };
};

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Unified Inventory Seed ===\n");

  // Step 1: Load all CSV sources
  const facebookRows = loadCsv<FacebookRow>(FACEBOOK_CSV, "Facebook Inventory");
  const shopifyRows = loadCsv<ShopifyRow>(SHOPIFY_CSV, "Shopify Inventory");
  const auctionRows = loadCsv<AuctionRow>(AUCTION_CSV, "Auction Inventory");

  const facebookMap = buildFacebookMap(facebookRows);
  const shopifyMap = buildShopifyMap(shopifyRows);
  const auctionMap = buildAuctionMap(auctionRows);

  console.log(`\nUnique SKUs: Facebook=${facebookMap.size}, Shopify=${shopifyMap.size}, Auction=${auctionMap.size}`);

  // Step 2: Merge all sources by SKU
  const mergedProducts = mergeProducts(facebookMap, shopifyMap, auctionMap);
  console.log(`Merged ${mergedProducts.length} unique products\n`);

  // Step 3: Load Amazon product data for enrichment
  const amazonProducts = loadAmazonProducts();

  // Step 4: Clear existing data
  await prisma.$transaction([prisma.product.deleteMany(), prisma.category.deleteMany()]);

  // Step 5: Import merged products
  const categoryCache = new Map<string, number>();
  const slugTracker = new Set<string>();
  let created = 0;
  let amazonMatched = 0;

  for (const [index, product] of mergedProducts.entries()) {
    // Category upsert
    const categorySlug = slugify(product.category, "uncategorized");
    let categoryId = categoryCache.get(categorySlug);
    if (!categoryId) {
      const category = await prisma.category.create({
        data: { name: product.category, slug: categorySlug },
      });
      categoryId = category.id;
      categoryCache.set(categorySlug, categoryId);
    }

    // Slug deduplication
    const baseSlug = slugify(product.sku || `${product.title}-${index}`, `product-${index}`);
    let slug = baseSlug;
    let dedupe = 1;
    while (slugTracker.has(slug)) {
      slug = `${baseSlug}-${dedupe++}`;
    }
    slugTracker.add(slug);

    // Amazon matching
    const amazonMatch = findAmazonMatch(product.title, amazonProducts);
    if (amazonMatch) {
      amazonMatched++;
    }

    // Price calculation
    const msrpValue = product.msrp ?? product.price;
    const salePrice = product.price;
    const priceDecimal = new Decimal(msrpValue.toFixed(2));
    const discountedDecimal = new Decimal(salePrice.toFixed(2));

    // Image merging
    const imageSet = mergeImages(
      product.imageUrl,
      product.additionalImages,
      amazonMatch?.data.product.images
    );

    // Reviews and rating
    const reviewsCount = amazonMatch?.data.product.reviews_count
      ? parseInt(amazonMatch.data.product.reviews_count.replace(/,/g, ""), 10)
      : Math.max(1, Math.round(product.quantity * 2));

    const rating = amazonMatch?.data.product.rating
      ? new Decimal(parseFloat(amazonMatch.data.product.rating))
      : null;

    // Brand: Amazon > Shopify > Facebook
    const brand =
      amazonMatch?.data.product.brand ||
      product.brand ||
      null;

    // Description: Amazon > merged CSV
    const description =
      amazonMatch?.data.product.description && amazonMatch.data.product.description.length > 50
        ? amazonMatch.data.product.description
        : product.description;

    // Features: combine Amazon features with auction/business metadata
    const features: Record<string, unknown> = {};
    if (amazonMatch?.data.product.features) {
      features.amazonFeatures = amazonMatch.data.product.features;
    }
    if (product.auctionMetadata) {
      features.auctionData = product.auctionMetadata;
    }
    if (product.shopifyMetadata) {
      features.shopifyData = {
        seoTitle: product.shopifyMetadata.seoTitle,
        seoDescription: product.shopifyMetadata.seoDescription,
        handle: product.shopifyMetadata.handle,
      };
    }
    if (product.condition) {
      features.condition = product.condition;
    }
    if (product.invoiceNumber) {
      features.invoiceNumber = product.invoiceNumber;
    }
    if (product.stockNumber) {
      features.stockNumber = product.stockNumber;
    }
    if (product.cost !== null) {
      features.costBasis = product.cost;
    }

    const featuresValue = Object.keys(features).length > 0 ? features : null;

    await prisma.product.create({
      data: {
        title: product.title,
        slug,
        description,
        reviews: reviewsCount,
        rating,
        brand,
        asin: amazonMatch?.asin || null,
        features: featuresValue as any,
        price: priceDecimal,
        discountedPrice: discountedDecimal,
        thumbnailUrls: imageSet.thumbnails,
        previewUrls: imageSet.previews,
        categoryId,
      },
    });

    created++;
  }

  // Step 6: Summary
  console.log("\n=== Import Summary ===");
  console.log(`Total products imported: ${created}`);
  console.log(`Categories created: ${categoryCache.size}`);
  console.log(`Matched with Amazon data: ${amazonMatched}`);
  console.log(`CSV-only (no Amazon match): ${created - amazonMatched}`);
  console.log(`Sources merged: Facebook + Shopify + Auction`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
