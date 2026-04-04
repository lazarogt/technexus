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

  const { createApp } = await import("../src/app");
  const response = await request(createApp()).get("/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
});
