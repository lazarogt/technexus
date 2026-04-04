import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

const prepareTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED ??= "false";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";
};

test("request logging middleware adds request ids without crashing the app", async () => {
  prepareTestEnv();

  const observabilityModule = await import("../src/services/observability.service");
  observabilityModule.resetRuntimeMetrics();

  const { createApp } = await import("../src/app");
  const response = await request(createApp())
    .get("/observability/metrics")
    .set("X-Request-Id", "req-test-123");

  assert.equal(response.status, 200);
  assert.equal(response.headers["x-request-id"], "req-test-123");
});
