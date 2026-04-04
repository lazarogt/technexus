import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const localRequire = createRequire(__filename);
const {
  CATEGORY_NAMES,
  buildSeedProducts,
  pickSeedSeller
} = localRequire("../scripts/resetAndSeed.helpers.cjs") as {
  CATEGORY_NAMES: string[];
  buildSeedProducts: () => Array<{
    categoryName: string;
    name: string;
    description: string;
    price: string;
    stock: number;
  }>;
  pickSeedSeller: (
    users: Array<{
      id: string;
      email: string;
      role: string;
      isBlocked: boolean;
      deletedAt: Date | null;
    }>,
    preferredAdminEmail?: string
  ) => { id: string; email: string; role: string };
};

test("pickSeedSeller prefers an active seller before admins", () => {
  const users = [
    {
      id: "admin-1",
      email: "admin@example.com",
      role: "admin",
      isBlocked: false,
      deletedAt: null
    },
    {
      id: "seller-1",
      email: "seller@example.com",
      role: "seller",
      isBlocked: false,
      deletedAt: null
    }
  ];

  const selected = pickSeedSeller(users, "admin@example.com");

  assert.equal(selected.id, "seller-1");
  assert.ok(users.map((user) => user.id).includes(selected.id));
});

test("pickSeedSeller falls back to the preferred admin when no seller exists", () => {
  const users = [
    {
      id: "admin-1",
      email: "other-admin@example.com",
      role: "admin",
      isBlocked: false,
      deletedAt: null
    },
    {
      id: "admin-2",
      email: "admin@example.com",
      role: "admin",
      isBlocked: false,
      deletedAt: null
    }
  ];

  const selected = pickSeedSeller(users, "admin@example.com");

  assert.equal(selected.id, "admin-2");
  assert.ok(users.map((user) => user.id).includes(selected.id));
});

test("buildSeedProducts returns a deterministic tech catalog", () => {
  const products = buildSeedProducts();

  assert.ok(products.length >= 20);
  assert.deepEqual(
    [...new Set(products.map((product) => product.categoryName))].sort(),
    [...CATEGORY_NAMES].sort()
  );

  for (const product of products) {
    assert.ok(product.name.length > 2);
    assert.ok(product.description.trim().length > 10);
    assert.ok(Number(product.price) > 20);
    assert.ok(Number(product.price) < 5_000);
    assert.ok(product.stock >= 5);
    assert.ok(product.stock <= 50);
    assert.ok(CATEGORY_NAMES.includes(product.categoryName));
  }
});
