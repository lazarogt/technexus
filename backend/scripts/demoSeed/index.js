const { createPrismaClient, initializeDatabaseEnv, runPrismaCommand } = require("../db-runtime.cjs");
const { createSeededRandom } = require("./utils");
const { prepareSellers } = require("./sellers");
const { seedCategories } = require("./categories");
const { seedProducts } = require("./products");
const { seedReviews } = require("./reviews");
const { seedOrders } = require("./orders");

initializeDatabaseEnv();

const prisma = createPrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

function runMigrations() {
  const result = runPrismaCommand(["migrate", "deploy"]);

  if (typeof result.status !== "number" || result.status !== 0) {
    throw new Error("Prisma migrate deploy failed for demo mode.");
  }
}

async function resetDemoData(tx) {
  await tx.$executeRawUnsafe(`
    TRUNCATE TABLE
      "OrderItem",
      "Order",
      "EmailOutbox",
      "LowStockAlert",
      "Inventory",
      "ProductImage",
      "CartItem",
      "Review",
      "Product",
      "Category",
      "AnalyticsEvent"
    RESTART IDENTITY CASCADE
  `);
}

async function main() {
  console.log("Applying pending database migrations...");
  runMigrations();

  const rng = createSeededRandom();
  await prisma.$connect();

  try {
    await prisma.$transaction(async (tx) => {
      await resetDemoData(tx);

      const users = await tx.user.findMany({
        where: {
          deletedAt: null,
          isBlocked: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isBlocked: true,
          deletedAt: true,
          createdAt: true
        },
        orderBy: {
          createdAt: "asc"
        }
      });

      const sellers = await prepareSellers(tx);
      console.log(`✔ sellers ready (${sellers.length})`);

      const { categoryByName } = await seedCategories(tx);
      console.log(`✔ categories created (${categoryByName.size})`);

      const products = await seedProducts(tx, {
        sellers,
        categoryByName,
        rng
      });
      console.log(`✔ products inserted (${products.length})`);

      const reviewsCount = await seedReviews(tx, {
        products,
        reviewers: users.filter((user) => user.role !== "admin"),
        rng
      });
      console.log(`✔ reviews generated (${reviewsCount})`);

      const ordersResult = await seedOrders(tx, {
        users,
        selectedSellers: sellers,
        products,
        rng
      });
      console.log(`✔ orders simulated (${ordersResult.count})`);
    });

    console.log("🚀 DEMO MODE READY");
  } catch (error) {
    console.error("Demo mode failed. Transaction rolled back.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
