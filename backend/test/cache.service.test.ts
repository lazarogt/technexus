import assert from "node:assert/strict";
import test from "node:test";

const prepareTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED = "true";
  process.env.REDIS_URL = "redis://redis:6379";
};

test("cache service falls back to in-memory storage when redis connect fails", async () => {
  prepareTestEnv();

  const { CacheService } = await import("../src/services/cache.service");

  const cache = new CacheService(() => ({
    isOpen: false,
    on: () => undefined,
    connect: async () => {
      throw new Error("connection refused");
    },
    quit: async () => undefined,
    get: async () => null,
    set: async () => undefined,
    keys: async () => [],
    del: async () => undefined,
    flushDb: async () => undefined
  }));

  await cache.connect();
  await cache.set("fallback-key", { ok: true }, 30);

  assert.deepEqual(await cache.get("fallback-key"), { ok: true });
});
