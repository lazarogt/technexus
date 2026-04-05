const { createPrismaClient, initializeDatabaseEnv, runMigrateDeployAndGenerate } = require("../db-runtime.cjs");
const { createSeededRandom } = require("./utils");
const { prepareSellers } = require("./sellers");
const { seedCategories } = require("./categories");
const { seedProducts } = require("./products");
const { seedReviews } = require("./reviews");
const { seedOrders } = require("./orders");

initializeDatabaseEnv();

const log = (level, message, extra = {}) => {
  process.stdout.write(
    `${JSON.stringify({
      level,
      time: new Date().toISOString(),
      component: "demo-seed",
      message,
      ...extra
    })}\n`
  );
};

const prisma = createPrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

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
  log("info", "Applying pending database migrations");
  await runMigrateDeployAndGenerate();

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
      log("info", "Sellers ready", { count: sellers.length });

      const { categoryByName } = await seedCategories(tx);
      log("info", "Categories created", { count: categoryByName.size });

      const products = await seedProducts(tx, {
        sellers,
        categoryByName,
        rng
      });
      log("info", "Products inserted", { count: products.length });

      const reviewsCount = await seedReviews(tx, {
        products,
        reviewers: users.filter((user) => user.role !== "admin"),
        rng
      });
      log("info", "Reviews generated", { count: reviewsCount });

      const ordersResult = await seedOrders(tx, {
        users,
        selectedSellers: sellers,
        products,
        rng
      });
      log("info", "Orders simulated", { count: ordersResult.count });
    });

    log("info", "Demo mode ready");
  } catch (error) {
    log("error", "Demo mode failed. Transaction rolled back", {
      error: error instanceof Error ? error.message : "Unknown demo seed error"
    });
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
