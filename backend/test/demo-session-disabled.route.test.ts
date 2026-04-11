import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

const prepareTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED ??= "false";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";
  process.env.DEMO_MODE = "false";
};

test("POST /api/auth/demo-session is unavailable when demo mode is disabled", async () => {
  prepareTestEnv();

  const { createApp } = await import("../src/app");
  const response = await request(createApp())
    .post("/api/auth/demo-session")
    .send({ role: "customer" });

  assert.equal(response.status, 404);
  assert.equal(response.body.code, "DEMO_MODE_DISABLED");
});
