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

async function main() {
  await prisma.$connect();

  try {
    const adminEmail = String(process.env.TECHNEXUS_ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
    const [productCount, adminUser] = await Promise.all([
      prisma.product.count(),
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

    if (productCount === 0) {
      log("info", "Bootstrapping demo catalog");
      runScript("db:demo");
      return;
    }

    log("info", "Demo catalog already present. Skipping bootstrap seed");
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
