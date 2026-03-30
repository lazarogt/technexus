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

