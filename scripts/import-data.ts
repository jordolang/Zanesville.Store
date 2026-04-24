import { PrismaClient, Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

interface Dump {
  exportedAt: string;
  counts: Record<string, number>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
    createdAt: string;
    updatedAt: string;
  }>;
  products: Array<{
    id: number;
    title: string;
    slug: string;
    description: string | null;
    reviews: number;
    rating: string | null;
    brand: string | null;
    asin: string | null;
    features: unknown;
    price: string;
    discountedPrice: string | null;
    msrp: string | null;
    thumbnailUrls: unknown;
    previewUrls: unknown;
    categoryId: number | null;
    active: boolean;
    soldAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  testimonials: Array<{
    id: number;
    author: string;
    role: string | null;
    message: string;
    rating: number;
    avatarUrl: string | null;
    createdAt: string;
  }>;
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    emailVerified: string | null;
    password: string | null;
    image: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
  }>;
  accounts: Array<Record<string, unknown>>;
  sessions: Array<Record<string, unknown>>;
  verificationTokens: Array<Record<string, unknown>>;
}

function toDate(s: string | null): Date | null {
  return s ? new Date(s) : null;
}

async function resetSequence(table: string, column = "id"): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), COALESCE((SELECT MAX("${column}") FROM "${table}"), 1));`,
  );
}

async function main(): Promise<void> {
  const dumpPath = path.resolve("prisma/sqlite-dump.json");
  const dump = JSON.parse(readFileSync(dumpPath, "utf-8")) as Dump;

  console.log("Importing from", dumpPath);
  console.log("Source counts:", dump.counts);

  console.log("Wiping target tables…");
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log(`Importing ${dump.categories.length} categories…`);
  for (const c of dump.categories) {
    await prisma.category.create({
      data: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
    });
  }
  await resetSequence("Category");

  console.log(`Importing ${dump.products.length} products…`);
  for (const p of dump.products) {
    await prisma.product.create({
      data: {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        reviews: p.reviews,
        rating: p.rating ? new Prisma.Decimal(p.rating) : null,
        brand: p.brand,
        asin: p.asin,
        features: (p.features ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        price: new Prisma.Decimal(p.price),
        discountedPrice: p.discountedPrice
          ? new Prisma.Decimal(p.discountedPrice)
          : null,
        msrp: p.msrp ? new Prisma.Decimal(p.msrp) : null,
        thumbnailUrls: p.thumbnailUrls as Prisma.InputJsonValue,
        previewUrls: p.previewUrls as Prisma.InputJsonValue,
        categoryId: p.categoryId,
        active: p.active,
        soldAt: toDate(p.soldAt),
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
    });
  }
  await resetSequence("Product");

  console.log(`Importing ${dump.testimonials.length} testimonials…`);
  for (const t of dump.testimonials) {
    await prisma.testimonial.create({
      data: {
        id: t.id,
        author: t.author,
        role: t.role,
        message: t.message,
        rating: t.rating,
        avatarUrl: t.avatarUrl,
        createdAt: new Date(t.createdAt),
      },
    });
  }
  if (dump.testimonials.length > 0) await resetSequence("Testimonial");

  console.log(`Importing ${dump.users.length} users…`);
  for (const u of dump.users) {
    await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: toDate(u.emailVerified),
        password: u.password,
        image: u.image,
        role: u.role,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
    });
  }

  const finalCounts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    testimonials: await prisma.testimonial.count(),
    users: await prisma.user.count(),
  };
  console.log("Target counts:", finalCounts);

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (adminEmail) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    console.log(
      admin
        ? `✔ Admin user "${adminEmail}" present (role=${admin.role}, has password=${!!admin.password})`
        : `⚠ Admin user "${adminEmail}" NOT FOUND in dump`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
