import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import { env } from "../src/utils/config";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.databaseUrl
    }
  }
});

async function main() {
  const passwordHash = await bcrypt.hash(
    env.TECHNEXUS_ADMIN_PASSWORD,
    env.PASSWORD_SALT_ROUNDS
  );

  await prisma.user.upsert({
    where: { email: env.TECHNEXUS_ADMIN_EMAIL.toLowerCase() },
    update: {
      name: "TechNexus Admin",
      passwordHash,
      role: UserRole.admin,
      deletedAt: null,
      isBlocked: false
    },
    create: {
      name: "TechNexus Admin",
      email: env.TECHNEXUS_ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      role: UserRole.admin,
      isBlocked: false
    }
  });
}

main()
  .catch((error) => {
    console.error("Seed error", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
