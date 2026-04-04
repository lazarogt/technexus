import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const localRequire = createRequire(__filename);
const { createSeededRandom } = localRequire("../scripts/demoSeed/utils.js") as {
  createSeededRandom: (seed?: string) => () => number;
};
const { selectPromotableUsers } = localRequire("../scripts/demoSeed/sellers.js") as {
  selectPromotableUsers: (
    users: Array<{
      id: string;
      role: string;
      isBlocked: boolean;
      deletedAt: Date | null;
      createdAt: Date;
      _count: { products: number; orders: number; carts: number };
    }>
  ) => Array<{ id: string }>;
};
const {
  PRICE_RULES,
  buildDemoProducts,
  validateProductBlueprints
} = localRequire("../scripts/demoSeed/products.js") as {
  PRICE_RULES: Record<string, { min: number; max: number }>;
  buildDemoProducts: (
    sellers: Array<{ id: string; name: string; email: string; locationId: string }>,
    categoryByName: Map<string, { id: string; name: string }>,
    rng: () => number
  ) => Array<{ categoryName: string; price: string; stock: number; sellerId: string }>;
  validateProductBlueprints: () => void;
};
const {
  calculateOrderTotals,
  pickOrderStatus
} = localRequire("../scripts/demoSeed/orders.js") as {
  calculateOrderTotals: (
    items: Array<{ subtotal: number }>,
    shippingCost: number
  ) => { itemsSubtotal: number; shippingCost: number; total: number };
  pickOrderStatus: (rng: () => number) => string;
};
const {
  buildReviewDrafts,
  pickReviewRating
} = localRequire("../scripts/demoSeed/reviews.js") as {
  buildReviewDrafts: (input: {
    products: Array<{ id: string; name: string; sellerId: string; createdAt: Date }>;
    reviewers: Array<{ id: string; role: string }>;
    rng: () => number;
  }) => Array<{ productId: string; userId: string; rating: number; createdAt: Date }>;
  pickReviewRating: (rng: () => number) => number;
};

test("selectPromotableUsers keeps only safe non-admin candidates", () => {
  const result = selectPromotableUsers([
    {
      id: "customer-safe",
      role: "customer",
      isBlocked: false,
      deletedAt: null,
      createdAt: new Date("2026-03-01T10:00:00.000Z"),
      _count: { products: 0, orders: 0, carts: 0 }
    },
    {
      id: "customer-has-orders",
      role: "customer",
      isBlocked: false,
      deletedAt: null,
      createdAt: new Date("2026-03-01T11:00:00.000Z"),
      _count: { products: 0, orders: 2, carts: 0 }
    },
    {
      id: "seller-existing",
      role: "seller",
      isBlocked: false,
      deletedAt: null,
      createdAt: new Date("2026-03-01T09:00:00.000Z"),
      _count: { products: 1, orders: 0, carts: 0 }
    },
    {
      id: "admin-user",
      role: "admin",
      isBlocked: false,
      deletedAt: null,
      createdAt: new Date("2026-03-01T08:00:00.000Z"),
      _count: { products: 0, orders: 0, carts: 0 }
    }
  ]);

  assert.deepEqual(result.map((user) => user.id), ["customer-safe"]);
});

test("buildDemoProducts enforces seeded catalog ranges and distribution", () => {
  validateProductBlueprints();

  const sellers = Array.from({ length: 5 }, (_, index) => ({
    id: `seller-${index + 1}`,
    name: `Seller ${index + 1}`,
    email: `seller-${index + 1}@example.com`,
    locationId: `location-${index + 1}`
  }));
  const categoryNames = Object.keys(PRICE_RULES);
  const categoryByName = new Map(
    categoryNames.map((name, index) => [name, { id: `category-${index + 1}`, name }])
  );
  const rng = createSeededRandom("products-test");

  const products = buildDemoProducts(sellers, categoryByName, rng);

  assert.ok(products.length >= 40);

  for (const product of products) {
    const range = PRICE_RULES[product.categoryName];
    assert.ok(Number(product.price) >= range.min);
    assert.ok(Number(product.price) <= range.max);
    assert.ok(product.stock >= 5 && product.stock <= 100);
  }
});

test("order helpers calculate totals and preserve weighted status options", () => {
  const totals = calculateOrderTotals(
    [
      { subtotal: 199.99 },
      { subtotal: 75.5 }
    ],
    12.49
  );

  assert.equal(totals.itemsSubtotal, 275.49);
  assert.equal(totals.shippingCost, 12.49);
  assert.equal(totals.total, 287.98);

  const rng = createSeededRandom("status-test");
  const statuses = Array.from({ length: 120 }, () => pickOrderStatus(rng));
  const deliveredCount = statuses.filter((status) => status === "delivered").length;
  const shippedCount = statuses.filter((status) => status === "shipped").length;
  const pendingCount = statuses.filter((status) => status === "pending").length;

  assert.ok(deliveredCount > shippedCount);
  assert.ok(shippedCount > pendingCount);
});

test("review helpers generate eligible reviewer drafts with positive ratings", () => {
  const rng = createSeededRandom("reviews-test");
  const reviews = buildReviewDrafts({
    products: [
      {
        id: "product-1",
        name: "Demo Product",
        sellerId: "seller-1",
        createdAt: new Date("2026-03-10T12:00:00.000Z")
      }
    ],
    reviewers: [
      { id: "seller-1", role: "seller" },
      { id: "customer-1", role: "customer" },
      { id: "customer-2", role: "customer" },
      { id: "customer-3", role: "customer" }
    ],
    rng
  });

  assert.ok(reviews.length >= 2);
  assert.ok(reviews.every((review) => review.userId !== "seller-1"));
  assert.ok(reviews.every((review) => review.rating >= 3 && review.rating <= 5));
  assert.ok(reviews.every((review) => review.createdAt >= new Date("2026-03-11T00:00:00.000Z")));

  const ratings = Array.from({ length: 60 }, () => pickReviewRating(createSeededRandom("rating-seed")));
  assert.ok(ratings.every((rating) => rating >= 3 && rating <= 5));
});
