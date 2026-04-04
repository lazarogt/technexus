import assert from "node:assert/strict";
import test from "node:test";

const prepareTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED ??= "false";
};

test("calculateDatabaseRetryDelayMs uses bounded exponential backoff", async () => {
  prepareTestEnv();

  const { calculateDatabaseRetryDelayMs } = await import("../src/services/prisma.service");

  assert.equal(calculateDatabaseRetryDelayMs(1, 2_000, 10_000), 2_000);
  assert.equal(calculateDatabaseRetryDelayMs(2, 2_000, 10_000), 4_000);
  assert.equal(calculateDatabaseRetryDelayMs(3, 2_000, 10_000), 8_000);
  assert.equal(calculateDatabaseRetryDelayMs(4, 2_000, 10_000), 10_000);
  assert.equal(calculateDatabaseRetryDelayMs(8, 2_000, 10_000), 10_000);
});
