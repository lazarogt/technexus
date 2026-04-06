const { spawnSync } = require("node:child_process");
const { createPrismaClient, initializeDatabaseEnv } = require("./db-runtime.cjs");

initializeDatabaseEnv();

const prisma = createPrismaClient({
  log: ["error"]
});

const log = (level, message, extra = {}) => {
  process.stdout.write(
    `${JSON.stringify({
      level,
      time: new Date().toISOString(),
      component: "docker-bootstrap",
      message,
      ...extra
    })}\n`
  );
};

const runScript = (scriptName) => {
  const result = spawnSync("npm", ["run", scriptName], {
    stdio: "inherit",
    env: process.env
  });

  if (result.status !== 0) {
    throw new Error(`npm run ${scriptName} failed.`);
  }
};

const hasCompleteDemoCatalog = (counts) =>
  counts.productCount > 0 &&
  counts.categoryCount > 0 &&
  counts.reviewCount > 0 &&
  counts.orderCount > 0 &&
  counts.analyticsEventCount > 0;

async function main() {
  await prisma.$connect();

  try {
    const adminEmail = String(process.env.TECHNEXUS_ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
    const [counts, adminUser] = await Promise.all([
      Promise.all([
        prisma.product.count(),
        prisma.category.count(),
        prisma.review.count(),
        prisma.order.count(),
        prisma.analyticsEvent.count()
      ]).then(([productCount, categoryCount, reviewCount, orderCount, analyticsEventCount]) => ({
        productCount,
        categoryCount,
        reviewCount,
        orderCount,
        analyticsEventCount
      })),
      prisma.user.findUnique({
        where: {
          email: adminEmail
        },
        select: {
          id: true
        }
      })
    ]);

    if (!adminUser) {
      log("info", "Bootstrapping baseline users");
      runScript("db:seed");
    }

    if (!hasCompleteDemoCatalog(counts)) {
      log("info", "Bootstrapping demo catalog", counts);
      runScript("db:demo");
      return;
    }

    log("info", "Demo catalog already present. Skipping bootstrap seed", counts);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  log("error", "Docker bootstrap failed", {
    error: error instanceof Error ? error.message : "Unknown bootstrap error"
  });
  process.exit(1);
});
