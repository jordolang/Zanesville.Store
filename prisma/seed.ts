import { Prisma, PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

const DEFAULT_IMAGE = "/images/products/placeholder.png";
const INVENTORY_PATH =
  process.env.FACEBOOK_INVENTORY_PATH ??
  path.resolve(process.cwd(), "Zanesville-store-lists/facebook_inventory_detailed.csv");

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

const buildDescription = (row: InventoryRow) => {
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

async function main() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    throw new Error(`Inventory file not found at ${INVENTORY_PATH}`);
  }

  const csvInput = fs.readFileSync(INVENTORY_PATH, "utf8");
  const rows: InventoryRow[] = parse(csvInput, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  });

  await prisma.$transaction([prisma.product.deleteMany(), prisma.category.deleteMany()]);

  const categoryCache = new Map<string, number>();
  let created = 0;
  const slugTracker = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const title = row.title?.trim();
    if (!title) continue;

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

    const msrp = parsePrice(row.msrp, row.price);
    const salePrice = parsePrice(row.price, row.cost, row.discount_pct);
    const priceDecimal = new Prisma.Decimal((msrp ?? salePrice ?? 0).toFixed(2));
    const discountedDecimal = salePrice
      ? new Prisma.Decimal(salePrice.toFixed(2))
      : priceDecimal;

    const thumbnails = toImages(row.image_url);
    const previewImages = toImages(row.additional_images);

    const imageSet = {
      thumbnails: thumbnails.length > 0 ? thumbnails : [DEFAULT_IMAGE],
      previews:
        previewImages.length > 0
          ? previewImages
          : thumbnails.length > 0
            ? thumbnails
            : [DEFAULT_IMAGE],
    };

    const reviews = Math.max(1, Math.round((Number(row.quantity) || 1) * 2));

    await prisma.product.create({
      data: {
        title,
        slug,
        description: buildDescription(row),
        reviews,
        price: priceDecimal,
        discountedPrice: discountedDecimal,
        thumbnailUrls: imageSet.thumbnails,
        previewUrls: imageSet.previews,
        categoryId,
      },
    });

    created += 1;
  }

  console.log(`Imported ${created} products from facebook inventory.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
