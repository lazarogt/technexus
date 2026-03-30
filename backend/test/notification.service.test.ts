import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBuyerOrderEmail,
  buildSellerOrderEmail,
  groupOrderItemsBySeller,
  type EmailOrderRecord
} from "../src/services/notification.service";

const order: EmailOrderRecord = {
  id: "11111111-2222-3333-4444-555555555555",
  userId: "buyer-1",
  userName: "Buyer One",
  userEmail: "buyer@technexus.test",
  userPhone: "+1 555 111 2222",
  shippingAddress: "742 Evergreen Terrace",
  shippingCost: 12.5,
  paymentMethod: "cash_on_delivery",
  total: 412.48,
  status: "pending",
  createdAt: "2026-03-28T20:18:10.262Z",
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      productName: "Keyboard",
      productDescription: "Mechanical keyboard",
      sellerId: "seller-1",
      sellerName: "Seller A",
      sellerEmail: "seller-a@technexus.test",
      quantity: 1,
      price: 99.99,
      subtotal: 99.99,
      images: []
    },
    {
      id: "item-2",
      productId: "prod-2",
      productName: "Mouse",
      productDescription: "Gaming mouse",
      sellerId: "seller-1",
      sellerName: "Seller A",
      sellerEmail: "seller-a@technexus.test",
      quantity: 2,
      price: 49.99,
      subtotal: 99.98,
      images: []
    },
    {
      id: "item-3",
      productId: "prod-3",
      productName: "Monitor",
      productDescription: "27 inch monitor",
      sellerId: "seller-2",
      sellerName: "Seller B",
      sellerEmail: "seller-b@technexus.test",
      quantity: 1,
      price: 200.01,
      subtotal: 200.01,
      images: []
    }
  ]
};

test("groupOrderItemsBySeller groups items by seller and totals subtotals", () => {
  const grouped = groupOrderItemsBySeller(order);

  assert.equal(grouped.length, 2);
  assert.equal(grouped[0]?.sellerId, "seller-1");
  assert.equal(grouped[0]?.subtotal, 199.97);
  assert.equal(grouped[1]?.sellerId, "seller-2");
  assert.equal(grouped[1]?.subtotal, 200.01);
});

test("buyer email includes order and total context", () => {
  const email = buildBuyerOrderEmail(order);

  assert.match(email.text, /TechNexus order confirmed/);
  assert.match(email.text, /Buyer One/);
  assert.match(email.text, /Order total: \$412\.48/);
});

test("seller email contains only the seller's items", () => {
  const sellerGroup = groupOrderItemsBySeller(order)[0]!;
  const email = buildSellerOrderEmail(order, sellerGroup);

  assert.match(email.text, /Seller subtotal: \$199\.97/);
  assert.match(email.text, /Keyboard/);
  assert.doesNotMatch(email.text, /Monitor/);
});
