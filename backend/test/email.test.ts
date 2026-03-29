import assert from "node:assert/strict";
import test from "node:test";
import { __testUtils, initEmailService, sendOrderCreatedEmails } from "../src/email";
import type { OrderRecord } from "../src/orders";

type SentMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const baseOrder: OrderRecord = {
  id: "11111111-2222-3333-4444-555555555555",
  userId: "buyer-1",
  userName: "Buyer One",
  userEmail: "buyer@technexus.test",
  userPhone: "+1 555 111 2222",
  shippingAddress: "742 Evergreen Terrace, Springfield",
  shippingCost: 12.5,
  total: 412.48,
  status: "pending",
  createdAt: "2026-03-28T20:18:10.262Z",
  items: [
    {
      id: "item-1",
      productId: "product-1",
      productName: "Laptop Pro",
      productDescription: "Laptop",
      sellerId: "seller-a",
      sellerName: "Seller A",
      sellerEmail: "seller-a@technexus.test",
      quantity: 1,
      price: 299.99,
      subtotal: 299.99,
      images: []
    },
    {
      id: "item-2",
      productId: "product-2",
      productName: "Wireless Mouse",
      productDescription: "Mouse",
      sellerId: "seller-b",
      sellerName: "Seller B",
      sellerEmail: "seller-b@technexus.test",
      quantity: 2,
      price: 49.99,
      subtotal: 99.98,
      images: []
    }
  ]
};

const createFakeTransport = (options?: {
  failRecipients?: Set<string>;
  verifyShouldFail?: boolean;
}) => {
  const sent: SentMail[] = [];

  return {
    sent,
    transport: {
      async verify() {
        if (options?.verifyShouldFail) {
          const error = new Error("verify failed") as Error & { code?: string };
          error.code = "EAUTH";
          throw error;
        }
      },
      async sendMail(mail: SentMail) {
        if (options?.failRecipients?.has(mail.to)) {
          const error = new Error("smtp send failed") as Error & { code?: string };
          error.code = "ECONNECTION";
          throw error;
        }

        sent.push(mail);
      }
    }
  };
};

test.afterEach(() => {
  __testUtils.reset();
});

test("buyer gets exactly one full order confirmation email", async () => {
  const fake = createFakeTransport();
  __testUtils.setTransport(fake.transport);

  await sendOrderCreatedEmails(baseOrder);

  const buyerEmails = fake.sent.filter((mail) => mail.to === baseOrder.userEmail);
  assert.equal(buyerEmails.length, 1);
  assert.match(buyerEmails[0].subject, /TechNexus order confirmed #/);
  assert.match(buyerEmails[0].html, /Laptop Pro/);
  assert.match(buyerEmails[0].html, /Wireless Mouse/);
  assert.match(buyerEmails[0].html, /Cash on delivery/);
  assert.match(buyerEmails[0].html, /742 Evergreen Terrace/);
});

test("each seller gets exactly one email and only their own items", async () => {
  const fake = createFakeTransport();
  __testUtils.setTransport(fake.transport);

  await sendOrderCreatedEmails(baseOrder);

  const sellerA = fake.sent.find((mail) => mail.to === "seller-a@technexus.test");
  const sellerB = fake.sent.find((mail) => mail.to === "seller-b@technexus.test");
  const adminEmails = fake.sent.filter((mail) => mail.to.includes("admin"));

  assert.ok(sellerA);
  assert.ok(sellerB);
  assert.equal(adminEmails.length, 0);

  assert.match(sellerA.html, /Laptop Pro/);
  assert.doesNotMatch(sellerA.html, /Wireless Mouse/);

  assert.match(sellerB.html, /Wireless Mouse/);
  assert.doesNotMatch(sellerB.html, /Laptop Pro/);
});

test("email failures do not fail order creation notifications", async () => {
  const fake = createFakeTransport({
    failRecipients: new Set(["seller-b@technexus.test"])
  });

  __testUtils.setTransport(fake.transport);

  await assert.doesNotReject(() => sendOrderCreatedEmails(baseOrder));
  assert.ok(fake.sent.some((mail) => mail.to === baseOrder.userEmail));
  assert.ok(fake.sent.some((mail) => mail.to === "seller-a@technexus.test"));
});

test("SMTP verify failure disables email sending without crashing", async () => {
  const fake = createFakeTransport({ verifyShouldFail: true });
  __testUtils.setTransportFactory(() => fake.transport);

  const enabled = await initEmailService();

  assert.equal(enabled, false);
  await assert.doesNotReject(() => sendOrderCreatedEmails(baseOrder));
  assert.equal(fake.sent.length, 0);
});
