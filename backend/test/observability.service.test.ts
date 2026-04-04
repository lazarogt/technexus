import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

const prepareTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED ??= "false";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";
};

test("GET /observability/metrics returns runtime counters", async () => {
  prepareTestEnv();

  const observabilityModule = await import("../src/services/observability.service");
  observabilityModule.resetRuntimeMetrics();

  const { createApp } = await import("../src/app");
  const app = createApp();

  const first = await request(app).get("/observability/metrics");
  assert.equal(first.status, 200);
  assert.equal(typeof first.body.uptime, "number");
  assert.equal(typeof first.body.totalRequests, "number");
  assert.equal(typeof first.body.errorCount, "number");

  const second = await request(app).get("/api/observability/metrics");
  assert.equal(second.status, 200);
  assert.ok(second.body.totalRequests >= first.body.totalRequests);
});
