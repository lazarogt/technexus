import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

const prepareTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED ??= "false";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";
};

test("GET /health returns 200", async () => {
  prepareTestEnv();

  const prismaModule = await import("../src/services/prisma.service");
  const cacheModule = await import("../src/services/cache.service");
  const observabilityModule = await import("../src/services/observability.service");
  const originalQueryRaw = prismaModule.prisma.$queryRaw;
  const originalCacheHealth = cacheModule.cacheService.getHealthStatus.bind(cacheModule.cacheService);

  prismaModule.prisma.$queryRaw = (async () => [{ ok: 1 }]) as typeof prismaModule.prisma.$queryRaw;
  cacheModule.cacheService.getHealthStatus = () => "degraded";
  observabilityModule.resetRuntimeMetrics();

  const { createApp } = await import("../src/app");
  const response = await request(createApp()).get("/health");

  prismaModule.prisma.$queryRaw = originalQueryRaw;
  cacheModule.cacheService.getHealthStatus = originalCacheHealth;

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.db, "up");
  assert.equal(response.body.redis, "degraded");
  assert.equal(typeof response.body.uptime, "number");
  assert.ok(response.headers["x-request-id"]);
});
