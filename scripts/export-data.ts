import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  const [
    categories,
    products,
    testimonials,
    users,
    accounts,
    sessions,
    verificationTokens,
  ] = await Promise.all([
    prisma.category.findMany({ orderBy: { id: "asc" } }),
    prisma.product.findMany({ orderBy: { id: "asc" } }),
    prisma.testimonial.findMany({ orderBy: { id: "asc" } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.account.findMany(),
    prisma.session.findMany(),
    prisma.verificationToken.findMany(),
  ]);

  const dump = {
    exportedAt: new Date().toISOString(),
    counts: {
      categories: categories.length,
      products: products.length,
      testimonials: testimonials.length,
      users: users.length,
      accounts: accounts.length,
      sessions: sessions.length,
      verificationTokens: verificationTokens.length,
    },
    categories,
    products,
    testimonials,
    users,
    accounts,
    sessions,
    verificationTokens,
  };

  const outPath = path.resolve("prisma/sqlite-dump.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      dump,
      (_key, value) => {
        if (typeof value === "bigint") return value.toString();
        if (value && typeof value === "object" && "toFixed" in value) {
          return value.toString();
        }
        return value;
      },
      2,
    ),
  );

  console.log(`Wrote ${outPath}`);
  console.log("Counts:", dump.counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
