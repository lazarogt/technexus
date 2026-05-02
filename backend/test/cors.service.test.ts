import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

const prepareTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED ??= "false";
};

test("cors reflects the request origin and allows credentials for api preflight requests", async () => {
  prepareTestEnv();

  const { createApp } = await import("../src/app");
  const response = await request(createApp())
    .options("/api/products")
    .set("Origin", "https://technexus-demo.ngrok-free.app")
    .set("Access-Control-Request-Method", "GET");

  assert.equal(response.status, 204);
  assert.equal(response.headers["access-control-allow-origin"], "https://technexus-demo.ngrok-free.app");
  assert.equal(response.headers["access-control-allow-credentials"], "true");
});
