import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPersistedOrderSnapshot,
  enqueueOrderNotificationsSafely,
  type OrderRecord
} from "../src/orders";

const baseOrder: OrderRecord = {
  id: "11111111-2222-3333-4444-555555555555",
  userId: "buyer-1",
  userName: "Buyer One",
  userEmail: "buyer@technexus.test",
  userPhone: "+1 555 111 2222",
  shippingAddress: "{\"line1\":\"742 Evergreen Terrace\",\"city\":\"Springfield\"}",
  shippingCost: 12.5,
  paymentMethod: "cash_on_delivery",
  total: 412.48,
  status: "pending",
  createdAt: "2026-03-28T20:18:10.262Z",
  items: []
};

test("buyer order fields are normalized for persistence", () => {
  const snapshot = buildPersistedOrderSnapshot({
    buyerName: "Buyer One",
    buyerEmail: "buyer@technexus.test",
    buyerPhone: " +1 555 111 2222 ",
    shippingAddress: JSON.stringify({
      line1: "742 Evergreen Terrace",
      city: "Springfield",
      postalCode: "10001"
    }),
    shippingCost: 12.5,
    itemsSubtotal: 399.98
  });

  assert.equal(snapshot.buyerName, "Buyer One");
  assert.equal(snapshot.buyerEmail, "buyer@technexus.test");
  assert.equal(snapshot.buyerPhone, "+1 555 111 2222");
  assert.deepEqual(snapshot.shippingAddress, {
    line1: "742 Evergreen Terrace",
    city: "Springfield",
    postalCode: "10001"
  });
  assert.equal(snapshot.shippingCost, 12.5);
  assert.equal(snapshot.paymentMethod, "cash_on_delivery");
  assert.equal(snapshot.orderTotal, 412.48);
});

test("order creation flow does not fail if notification enqueue fails", async () => {
  const queries: string[] = [];
  const fakeClient = {
    async query(sql: string) {
      queries.push(sql);
      return { rows: [], rowCount: 0 };
    }
  };

  await assert.doesNotReject(() =>
    enqueueOrderNotificationsSafely(fakeClient, baseOrder, async () => {
      throw new Error("outbox offline");
    })
  );

  assert.equal(queries[0], "SAVEPOINT order_email_outbox");
  assert.equal(queries[1], "ROLLBACK TO SAVEPOINT order_email_outbox");
  assert.equal(queries[2], "RELEASE SAVEPOINT order_email_outbox");
});
