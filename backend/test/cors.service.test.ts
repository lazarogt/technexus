import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

const prepareTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED ??= "false";
  process.env.CORS_ORIGIN = "https://technexus.example.com,http://localhost:5173";
};

test("cors allows configured origins and credentials for api preflight requests", async () => {
  prepareTestEnv();

  const { createApp } = await import("../src/app");
  const response = await request(createApp())
    .options("/api/products")
    .set("Origin", "https://technexus.example.com")
    .set("Access-Control-Request-Method", "GET");

  assert.equal(response.status, 204);
  assert.equal(response.headers["access-control-allow-origin"], "https://technexus.example.com");
  assert.equal(response.headers["access-control-allow-credentials"], "true");
});

test("cors does not reflect unconfigured origins", async () => {
  prepareTestEnv();

  const { createApp } = await import("../src/app");
  const response = await request(createApp())
    .options("/api/products")
    .set("Origin", "https://evil.example.com")
    .set("Access-Control-Request-Method", "GET");

  assert.equal(response.headers["access-control-allow-origin"], undefined);
});
