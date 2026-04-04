const {
  CATEGORY_NAMES,
  buildSeedProducts,
  findResettableTables,
  pickSeedSeller,
  quoteIdentifier
} = require("./resetAndSeed.helpers.cjs");
const { createPrismaClient, initializeDatabaseEnv, runPrismaCommand } = require("./db-runtime.cjs");

initializeDatabaseEnv();

const prisma = createPrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

const runMigrations = () => {
  const result = runPrismaCommand(["migrate", "deploy"]);

  if (typeof result.status !== "number" || result.status !== 0) {
    throw new Error("Prisma migrate deploy failed.");
  }
};

const loadExistingTables = async (tx) => {
  const rows = await tx.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = current_schema()
  `);

  return rows.map((row) => row.tablename);
};

const ensureSeedLocation = async (tx, sellerId) => {
  const existingLocation = await tx.location.findFirst({
    where: {
      sellerId,
      deletedAt: null
    },
    orderBy: { createdAt: "asc" }
  });

  if (existingLocation) {
    return existingLocation;
  }

  return tx.location.create({
    data: {
      sellerId,
      name: "Default Warehouse"
    }
  });
};

const main = async () => {
  console.log("Applying pending database migrations...");
  runMigrations();

  await prisma.$connect();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingTables = await loadExistingTables(tx);
      const tablesToTruncate = findResettableTables(existingTables);

      if (tablesToTruncate.length > 0) {
        await tx.$executeRawUnsafe(
          `TRUNCATE TABLE ${tablesToTruncate.map(quoteIdentifier).join(", ")} RESTART IDENTITY CASCADE`
        );
      }

      console.log(`Tables truncated: ${tablesToTruncate.length > 0 ? tablesToTruncate.join(", ") : "none"}`);

      const users = await tx.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          isBlocked: true,
          deletedAt: true
        },
        orderBy: { createdAt: "asc" }
      });

      const seller = pickSeedSeller(users, process.env.TECHNEXUS_ADMIN_EMAIL);
      const location = await ensureSeedLocation(tx, seller.id);

      await tx.category.createMany({
        data: CATEGORY_NAMES.map((name, index) => {
          const createdAt = new Date(Date.UTC(2026, 0, 15, 9 + index, 0, 0));
          return {
            name,
            createdAt,
            updatedAt: createdAt
          };
        })
      });

      console.log(`Categories created: ${CATEGORY_NAMES.join(", ")}`);

      const categories = await tx.category.findMany({
        where: {
          name: {
            in: CATEGORY_NAMES
          }
        },
        select: {
          id: true,
          name: true
        }
      });

      const categoryIdByName = new Map(categories.map((category) => [category.name, category.id]));
      const seedProducts = buildSeedProducts();

      for (const product of seedProducts) {
        const categoryId = categoryIdByName.get(product.categoryName);

        if (!categoryId) {
          throw new Error(`Missing category ${product.categoryName} during seed execution.`);
        }

        await tx.product.create({
          data: {
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            categoryId,
            sellerId: seller.id,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            images: {
              create: [
                {
                  url: product.imageUrl,
                  kind: "url",
                  position: 0,
                  createdAt: product.createdAt
                }
              ]
            },
            inventories: {
              create: [
                {
                  locationId: location.id,
                  quantity: product.stock,
                  lowStockThreshold: 5,
                  createdAt: product.createdAt,
                  updatedAt: product.updatedAt
                }
              ]
            }
          }
        });
      }

      console.log(`Products inserted: ${seedProducts.length}`);

      return {
        sellerEmail: seller.email,
        productCount: seedProducts.length
      };
    });

    console.log(`Done: seeded ${result.productCount} products using seller ${result.sellerEmail}`);
  } catch (error) {
    console.error("Reset and seed failed. Transaction rolled back.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

main();
