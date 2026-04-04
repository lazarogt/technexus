import assert from "node:assert/strict";
import test from "node:test";

const prepareTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED ??= "false";
  process.env.TEST_POSTGRES_DB ??= "technexus_test";
};

test("database connection succeeds", async () => {
  prepareTestEnv();

  const { connectDatabase, prisma } = await import("../src/services/prisma.service");

  try {
    await connectDatabase();

    const rows = await prisma.$queryRawUnsafe<Array<{ value: number }>>("SELECT 1 AS value");
    assert.equal(rows[0]?.value, 1);
  } finally {
    await prisma.$disconnect();
  }
});
