import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import type { User } from "@prisma/client";

const prepareTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??= "test-jwt-secret";
  process.env.REDIS_ENABLED ??= "false";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";
  process.env.DEMO_MODE = "true";
  process.env.TECHNEXUS_ADMIN_EMAIL ??= "admin@example.com";
};

const createMockUser = (input: {
  id: string;
  name: string;
  email: string;
  role: User["role"];
}): User => ({
  id: input.id,
  name: input.name,
  email: input.email,
  role: input.role,
  passwordHash: "hash",
  isBlocked: false,
  deletedAt: null,
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  updatedAt: new Date("2026-04-01T00:00:00.000Z")
});

test("POST /api/auth/demo-session returns seeded sessions for each demo role", async () => {
  prepareTestEnv();

  const prismaModule = await import("../src/services/prisma.service");
  const originalFindUnique = prismaModule.prisma.user.findUnique;

  prismaModule.prisma.user.findUnique = (async ({ where }) => {
    if (where.email === "customer.one@technexus.local") {
      return createMockUser({
        id: "customer-1",
        name: "Paula Herrera",
        email: "customer.one@technexus.local",
        role: "customer"
      });
    }

    if (where.email === "seller.one@technexus.local") {
      return createMockUser({
        id: "seller-1",
        name: "Lina Morales",
        email: "seller.one@technexus.local",
        role: "seller"
      });
    }

    if (where.email === "admin@example.com") {
      return createMockUser({
        id: "admin-1",
        name: "TechNexus Admin",
        email: "admin@example.com",
        role: "admin"
      });
    }

    return null;
  }) as typeof prismaModule.prisma.user.findUnique;

  const { createApp } = await import("../src/app");

  for (const role of ["customer", "seller", "admin"] as const) {
    const response = await request(createApp())
      .post("/api/auth/demo-session")
      .send({ role });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, role);
    assert.equal(typeof response.body.token, "string");
    assert.ok(response.body.token.length > 0);
  }

  prismaModule.prisma.user.findUnique = originalFindUnique;
});

test("POST /api/auth/demo-session rejects invalid roles", async () => {
  prepareTestEnv();

  const { createApp } = await import("../src/app");
  const response = await request(createApp())
    .post("/api/auth/demo-session")
    .send({ role: "guest" });

  assert.equal(response.status, 400);
});
