import assert from "node:assert/strict";
import test from "node:test";
import { buildPersistedOrderSnapshot } from "../src/services/order.service";

test("buildPersistedOrderSnapshot normalizes checkout fields and totals", () => {
  const snapshot = buildPersistedOrderSnapshot({
    buyerName: " Buyer One ",
    buyerEmail: "BUYER@technexus.test ",
    buyerPhone: " +1 555 111 2222 ",
    shippingAddress: " 742 Evergreen Terrace ",
    shippingCost: 12.5,
    itemsSubtotal: 399.98
  });

  assert.equal(snapshot.buyerName, "Buyer One");
  assert.equal(snapshot.buyerEmail, "buyer@technexus.test");
  assert.equal(snapshot.buyerPhone, "+1 555 111 2222");
  assert.deepEqual(snapshot.shippingAddress, {
    formatted: "742 Evergreen Terrace"
  });
  assert.equal(snapshot.shippingCost, 12.5);
  assert.equal(snapshot.paymentMethod, "cash_on_delivery");
  assert.equal(snapshot.orderTotal, 412.48);
});


import { validateCheckoutCart } from "../src/services/order.service";
import { AppError } from "../src/utils/errors";

const makeCheckoutCart = (overrides: Record<string, unknown> = {}) => ({
  id: "cart-1",
  items: [
    {
      id: "cart-item-1",
      quantity: 2,
      product: {
        id: "product-1",
        stock: 2,
        deletedAt: null,
        category: { deletedAt: null },
        seller: { deletedAt: null, isBlocked: false }
      },
      ...overrides
    }
  ]
});

test("validateCheckoutCart rejects stale quantities before order creation", () => {
  assert.throws(
    () => validateCheckoutCart(makeCheckoutCart({ quantity: 3 }) as never),
    (error) => error instanceof AppError && error.code === "INSUFFICIENT_STOCK"
  );
});

test("validateCheckoutCart rejects unavailable products before order creation", () => {
  assert.throws(
    () =>
      validateCheckoutCart(
        makeCheckoutCart({
          product: {
            id: "product-1",
            stock: 2,
            deletedAt: new Date(),
            category: { deletedAt: null },
            seller: { deletedAt: null, isBlocked: false }
          }
        }) as never
      ),
    (error) => error instanceof AppError && error.code === "PRODUCT_UNAVAILABLE"
  );
});
