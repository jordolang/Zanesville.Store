/**
 * Clean up junk product descriptions.
 *
 * - Strips descriptions that are JSON/array image blobs
 * - Falls back to a short summary built from title + brand + first feature
 *   when the existing description is unusable (too short, just the title,
 *   or an image URL dump).
 *
 * Usage:
 *   npx tsx scripts/clean-descriptions.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isImageBlobDescription(description: string): boolean {
  const trimmed = description.trim();
  if (trimmed.startsWith("['https") || trimmed.startsWith('["https')) {
    return true;
  }
  // Mostly URLs
  const urlMatches = trimmed.match(/https?:\/\//g) ?? [];
  if (urlMatches.length >= 3 && trimmed.length - urlMatches.length * 8 < 80) {
    return true;
  }
  return false;
}

function hasHtmlAltArtifacts(description: string): boolean {
  return /"\s*>/.test(description) || /<[a-z]+[^>]*>/i.test(description);
}

function isMostlyTitleRepeat(description: string, title: string): boolean {
  const desc = description.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const titleWords = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (titleWords.length === 0) return false;
  const descWords = desc.split(/\s+/).filter((w) => w.length > 2);
  if (descWords.length < 25) {
    // Short description: count how many of its words are also in the title
    const titleSet = new Set(titleWords);
    const overlap = descWords.filter((w) => titleSet.has(w)).length;
    return overlap / Math.max(descWords.length, 1) > 0.6;
  }
  return false;
}

function parseFeatures(value: unknown): string[] {
  if (!value) return [];
  let arr: unknown = value;
  if (typeof arr === "string") {
    try {
      arr = JSON.parse(arr);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

interface GenerateInput {
  title: string;
  brand: string | null;
  features: string[];
}

function generateDescription({
  title,
  brand,
  features,
}: GenerateInput): string {
  const opener = brand
    ? `${brand} ${title} — available now from Zanesville Store.`
    : `${title} — available now from Zanesville Store.`;

  const lead =
    "A used / open-box item from our Zanesville inventory. Photos reflect the actual piece you'll receive. Message us for additional details, dimensions, or condition questions before buying.";

  const featureBlock = features.slice(0, 3).filter((f) => f.length >= 20);
  const bullets =
    featureBlock.length > 0
      ? "\n\nHighlights:\n" + featureBlock.map((f) => `• ${f}`).join("\n")
      : "";

  return `${opener}\n\n${lead}${bullets}`;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const products = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      brand: true,
      description: true,
      features: true,
    },
  });

  let updated = 0;
  let kept = 0;

  for (const product of products) {
    const description = (product.description ?? "").trim();
    const features = parseFeatures(product.features);

    const needsRegen =
      description.length < 40 ||
      isImageBlobDescription(description) ||
      hasHtmlAltArtifacts(description) ||
      isMostlyTitleRepeat(description, product.title) ||
      description.toLowerCase().startsWith("lorem ipsum");

    if (!needsRegen) {
      kept++;
      continue;
    }

    const next = generateDescription({
      title: product.title,
      brand: product.brand ?? null,
      features,
    });

    // eslint-disable-next-line no-console
    console.log(
      `[${dryRun ? "DRY" : "UPDATE"}] #${product.id} ${product.title.slice(
        0,
        60,
      )} → (${next.length} chars)`,
    );

    if (!dryRun) {
      await prisma.product.update({
        where: { id: product.id },
        data: { description: next },
      });
    }
    updated++;
  }

  // eslint-disable-next-line no-console
  console.log(
    `\nDone. ${updated} regenerated, ${kept} kept (of ${products.length}).`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
