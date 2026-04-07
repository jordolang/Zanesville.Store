/**
 * Updates product records in the database using pre-scraped Amazon JSON files.
 *
 * Usage:
 *   npx tsx scripts/update-products-from-json.ts [--limit N] [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const JSON_DIR = path.resolve(process.cwd(), "public/images/products");

interface AmazonProduct {
  product: {
    name: string;
    brand: string;
    price: string;
    rating: string;
    reviews_count: string;
    description: string;
    features: string[];
    images: string[];
    specifications: Record<string, string>;
    url: string;
    scraped_at: string;
  };
}

function parseArgs(): { limit: number | null; dryRun: boolean } {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;
  const dryRun = args.includes("--dry-run");
  return { limit, dryRun };
}

function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

async function main() {
  const { limit, dryRun } = parseArgs();

  // Only update products that have a UNIQUE ASIN (1:1 mapping = trustworthy)
  // Products sharing an ASIN with others have wrong assignments and need title search
  const asinCounts = await prisma.product.groupBy({
    by: ["asin"],
    where: { asin: { not: null } },
    _count: true,
  });

  const uniqueAsins = new Set(
    asinCounts.filter((g) => g._count === 1 && g.asin).map((g) => g.asin!)
  );

  console.log(`Found ${uniqueAsins.size} products with unique (trustworthy) ASINs`);

  const products = await prisma.product.findMany({
    where: {
      asin: { in: Array.from(uniqueAsins) },
    },
    select: {
      id: true,
      title: true,
      asin: true,
      thumbnailUrls: true,
    },
  });

  // Find products that have matching JSON files
  const updates: Array<{
    id: number;
    asin: string;
    title: string;
    jsonData: AmazonProduct;
  }> = [];

  for (const product of products) {
    if (!product.asin) continue;
    const jsonPath = path.join(JSON_DIR, `${product.asin}.json`);
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, "utf-8");
        const data: AmazonProduct = JSON.parse(raw);
        if (data.product?.images?.length > 0) {
          updates.push({
            id: product.id,
            asin: product.asin,
            title: product.title,
            jsonData: data,
          });
        }
      } catch {
        console.warn(`  Skipping ${product.asin}: invalid JSON`);
      }
    }
  }

  const toProcess = limit ? updates.slice(0, limit) : updates;

  console.log(`\nFound ${updates.length} products with matching JSON files`);
  console.log(`Processing ${toProcess.length} products${dryRun ? " (DRY RUN)" : ""}\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of toProcess) {
    const { product } = item.jsonData;
    const images = product.images.filter(
      (url) => url.startsWith("http") && url.includes("amazon.com")
    );

    if (images.length === 0) {
      console.log(`  SKIP [${item.asin}] ${item.title.slice(0, 60)} - no valid images`);
      skipped++;
      continue;
    }

    const rawPrice = parsePrice(product.price);
    const amazonPrice = rawPrice && rawPrice > 0 ? rawPrice : null;
    const rawRating = product.rating ? parseFloat(product.rating) : null;
    const amazonRating = rawRating && rawRating > 0 ? rawRating : null;
    const amazonReviews = product.reviews_count
      ? parseInt(product.reviews_count.replace(/,/g, ""), 10)
      : null;

    if (dryRun) {
      console.log(`  WOULD UPDATE [${item.asin}] ${item.title.slice(0, 60)}`);
      console.log(`    Images: ${images.length}, Price: ${amazonPrice}, Rating: ${amazonRating}`);
      updated++;
      continue;
    }

    try {
      await prisma.product.update({
        where: { id: item.id },
        data: {
          thumbnailUrls: JSON.stringify(images.slice(0, 4)),
          previewUrls: JSON.stringify(images),
          ...(amazonPrice !== null ? { price: amazonPrice } : {}),
          ...(amazonRating !== null ? { rating: amazonRating } : {}),
          ...(amazonReviews !== null && !isNaN(amazonReviews)
            ? { reviews: amazonReviews }
            : {}),
          ...(product.brand ? { brand: product.brand } : {}),
          ...(product.description ? { description: product.description } : {}),
          ...(product.features?.length > 0
            ? { features: JSON.stringify(product.features) as unknown as undefined }
            : {}),
        },
      });
      console.log(`  OK [${item.asin}] ${item.title.slice(0, 60)} → ${images.length} images`);
      updated++;
    } catch (err) {
      console.error(`  ERROR [${item.asin}] ${item.title.slice(0, 60)}: ${err}`);
      errors++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${errors} errors`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
