import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Demote any pre-existing admins so only one admin account remains.
  const demoted = await prisma.user.updateMany({
    where: {
      role: "admin",
      NOT: { email },
    },
    data: { role: "user" },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "admin",
    },
    create: {
      email,
      password: hashedPassword,
      name: "Zanesville Store Admin",
      role: "admin",
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Admin user ready: ${user.email} (role=${user.role}). ` +
      `Demoted ${demoted.count} previous admin(s).`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
