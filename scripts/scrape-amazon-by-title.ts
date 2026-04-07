/**
 * Scrapes Amazon product data by searching product titles.
 * Uses Playwright to search Amazon and extract product details.
 *
 * Usage:
 *   npx tsx scripts/scrape-amazon-by-title.ts [--limit N] [--dry-run] [--delay MS]
 */
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { type Page } from "playwright";
import fs from "fs";
import path from "path";

chromium.use(StealthPlugin());

const prisma = new PrismaClient();
const JSON_DIR = path.resolve(process.cwd(), "public/images/products");

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const delayIdx = args.indexOf("--delay");
  return {
    limit: limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null,
    dryRun: args.includes("--dry-run"),
    delay: delayIdx !== -1 ? parseInt(args[delayIdx + 1], 10) : 4000,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanTitle(title: string): string {
  // Remove generic prefixes and truncate for better Amazon search
  return title
    .replace(/^Mystery\s+(Item|Pallet|Jewelry\s+Item)\s*/i, "")
    .replace(/\s*-\s*$/, "")
    .trim()
    .slice(0, 120);
}

async function searchAmazon(
  page: Page,
  title: string
): Promise<{
  asin: string;
  url: string;
} | null> {
  const query = encodeURIComponent(cleanTitle(title));
  const searchUrl = `https://www.amazon.com/s?k=${query}`;

  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Wait for search results
  await page.waitForSelector('[data-component-type="s-search-result"]', {
    timeout: 10000,
  }).catch(() => null);

  // Get first result's ASIN
  const firstResult = await page.$('[data-component-type="s-search-result"]');
  if (!firstResult) return null;

  const asin = await firstResult.getAttribute("data-asin");
  if (!asin) return null;

  return {
    asin,
    url: `https://www.amazon.com/dp/${asin}`,
  };
}

async function scrapeProductPage(
  page: Page,
  asin: string
): Promise<{
  name: string;
  brand: string;
  price: string;
  rating: string;
  reviews_count: string;
  description: string;
  features: string[];
  images: string[];
} | null> {
  const url = `https://www.amazon.com/dp/${asin}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Extract product data using individual $eval calls to avoid tsx decorator injection
  const name = await page.$eval("#productTitle", (el) => el.textContent?.trim() || "").catch(() => "");

  const brand = await page.$eval("#bylineInfo", (el) =>
    (el.textContent?.trim() || "").replace(/^(Visit the |Brand: )/, "").replace(/ Store$/, "")
  ).catch(() => "");

  const price = await page.$eval(".a-price .a-offscreen", (el) => el.textContent?.trim() || "").catch(() => "");

  const ratingText = await page.$eval("#acrPopover .a-icon-alt", (el) => el.textContent?.trim() || "").catch(() => "");
  const rating = ratingText.match(/([\d.]+) out of/)?.[1] || "";

  const reviewsText = await page.$eval("#acrCustomerReviewText", (el) => el.textContent?.trim() || "").catch(() => "");
  const reviews_count = reviewsText.match(/([\d,]+) rating/)?.[1] || reviewsText.replace(/[^\d,]/g, "") || "";

  const description = await page.$eval("#productDescription", (el) => el.textContent?.trim() || "").catch(() => "");

  const features = await page.$$eval("#feature-bullets li .a-list-item", (els) =>
    els.map((el) => el.textContent?.trim() || "").filter((t) => t.length > 10)
  ).catch(() => [] as string[]);

  // Extract images from page scripts (use var to avoid tsx decorators)
  const images: string[] = await page.evaluate(`
    (function() {
      var imgs = [];
      var scriptEls = document.querySelectorAll("script");
      for (var i = 0; i < scriptEls.length; i++) {
        var text = scriptEls[i].textContent || "";
        if (text.indexOf("colorImages") !== -1 || text.indexOf("ImageBlockATF") !== -1) {
          var re = /"hiRes"\\s*:\\s*"(https:\\/\\/[^"]+)"/g;
          var m;
          while ((m = re.exec(text)) !== null) {
            if (imgs.indexOf(m[1]) === -1) imgs.push(m[1]);
          }
          if (imgs.length === 0) {
            var re2 = /"large"\\s*:\\s*"(https:\\/\\/[^"]+)"/g;
            while ((m = re2.exec(text)) !== null) {
              if (imgs.indexOf(m[1]) === -1) imgs.push(m[1]);
            }
          }
        }
      }
      if (imgs.length === 0) {
        var mainImg = document.querySelector("#landingImage");
        if (mainImg && mainImg.getAttribute("src")) imgs.push(mainImg.getAttribute("src"));
      }
      return imgs;
    })()
  `);

  const data = { name, brand, price, rating, reviews_count, description, features, images };

  if (!data.name && data.images.length === 0) return null;
  return data;
}

async function main() {
  const { limit, dryRun, delay } = parseArgs();

  // Find products that need updating:
  // 1. Products with shared ASINs (wrongly assigned)
  // 2. Products with no ASIN
  const asinCounts = await prisma.product.groupBy({
    by: ["asin"],
    where: { asin: { not: null } },
    _count: true,
  });

  const sharedAsins = new Set(
    asinCounts.filter((g) => g._count > 1 && g.asin).map((g) => g.asin!)
  );

  const productsToFix = await prisma.product.findMany({
    where: {
      OR: [
        { asin: { in: Array.from(sharedAsins) } },
        { asin: null },
        { asin: "" },
      ],
    },
    select: { id: true, title: true, asin: true },
    orderBy: { id: "asc" },
  });

  // Filter out mystery/generic items that can't be searched
  const searchable = productsToFix.filter((p) => {
    const clean = cleanTitle(p.title);
    return clean.length > 5 && !/^mystery\s/i.test(p.title);
  });

  const toProcess = limit ? searchable.slice(0, limit) : searchable;

  console.log(`Total products needing fix: ${productsToFix.length}`);
  console.log(`Searchable (non-mystery): ${searchable.length}`);
  console.log(`Processing: ${toProcess.length}${dryRun ? " (DRY RUN)" : ""}`);
  console.log(`Delay between requests: ${delay}ms\n`);

  if (dryRun) {
    for (const p of toProcess.slice(0, 20)) {
      console.log(`  Would search: "${cleanTitle(p.title)}"`);
    }
    console.log(toProcess.length > 20 ? `  ... and ${toProcess.length - 20} more` : "");
    await prisma.$disconnect();
    return;
  }

  const browser = await chromium.launch({
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
    ],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    javaScriptEnabled: true,
  });
  const page = await context.newPage();

  // Remove webdriver flag
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let blocked = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const product = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    try {
      // Check if we already have a JSON file from a previous run
      const existingJson = path.join(JSON_DIR, `search_${product.id}.json`);
      if (fs.existsSync(existingJson)) {
        console.log(`  ${progress} CACHED [${product.id}] ${product.title.slice(0, 50)}`);
        // Could load from cache here - skip for now
        skipped++;
        continue;
      }

      // Search Amazon
      const searchResult = await searchAmazon(page, product.title);
      if (!searchResult) {
        console.log(`  ${progress} NO RESULT [${product.id}] ${product.title.slice(0, 50)}`);
        skipped++;
        await sleep(delay);
        continue;
      }

      // Check for CAPTCHA/block - check for actual CAPTCHA form, not just the word in meta tags
      const hasCaptchaForm = await page.$('form[action*="validateCaptcha"]').then(el => !!el);
      const hasRobotCheck = await page.$('#captchacharacters').then(el => !!el);
      if (hasCaptchaForm || hasRobotCheck) {
        console.log(`  ${progress} BLOCKED - CAPTCHA detected. Stopping.`);
        blocked++;
        break;
      }

      await sleep(1500); // Brief pause between search and product page

      // Scrape product page
      const productData = await scrapeProductPage(page, searchResult.asin);
      if (!productData || productData.images.length === 0) {
        console.log(
          `  ${progress} NO DATA [${product.id}] ${product.title.slice(0, 50)}`
        );
        skipped++;
        await sleep(delay);
        continue;
      }

      // Save JSON for caching
      const jsonOut = {
        product: {
          ...productData,
          specifications: { asin: searchResult.asin },
          url: searchResult.url,
          scraped_at: new Date().toISOString(),
        },
      };
      fs.writeFileSync(
        path.join(JSON_DIR, `${searchResult.asin}.json`),
        JSON.stringify(jsonOut, null, 2)
      );

      // Update database
      const images = productData.images.filter((url) => url.startsWith("http"));
      const priceNum = parseFloat(
        productData.price.replace(/[^0-9.]/g, "")
      );
      const ratingNum = parseFloat(productData.rating);
      const reviewsNum = parseInt(
        productData.reviews_count.replace(/,/g, ""),
        10
      );

      await prisma.product.update({
        where: { id: product.id },
        data: {
          asin: searchResult.asin,
          thumbnailUrls: JSON.stringify(images.slice(0, 4)),
          previewUrls: JSON.stringify(images),
          ...(priceNum > 0 ? { price: priceNum } : {}),
          ...(ratingNum > 0 ? { rating: ratingNum } : {}),
          ...(!isNaN(reviewsNum) && reviewsNum > 0 ? { reviews: reviewsNum } : {}),
          ...(productData.brand ? { brand: productData.brand } : {}),
          ...(productData.description
            ? { description: productData.description }
            : {}),
          ...(productData.features.length > 0
            ? { features: JSON.stringify(productData.features) as unknown as undefined }
            : {}),
        },
      });

      console.log(
        `  ${progress} OK [${searchResult.asin}] ${product.title.slice(0, 50)} → ${images.length} imgs`
      );
      updated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("captcha") || msg.includes("bot")) {
        console.log(`  ${progress} BLOCKED - stopping to avoid ban`);
        blocked++;
        break;
      }
      console.error(
        `  ${progress} ERROR [${product.id}] ${product.title.slice(0, 50)}: ${msg.slice(0, 100)}`
      );
      errors++;
    }

    await sleep(delay);
  }

  await browser.close();
  await prisma.$disconnect();

  console.log(
    `\nDone: ${updated} updated, ${skipped} skipped, ${errors} errors, ${blocked} blocked`
  );
  if (blocked > 0) {
    console.log(
      "Note: Amazon blocked requests. Try again later with --delay 8000 or use a proxy."
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
