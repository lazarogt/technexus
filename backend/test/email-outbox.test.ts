import assert from "node:assert/strict";
import test from "node:test";
import {
  __testUtils,
  buildOrderEmailOutboxEntries,
  getEmailOutboxOverview,
  getEmailOutboxWorkerHealth,
  resetFailedEmailOutboxRow,
  retryEmailOutboxById,
  retryFailedEmailOutboxRows,
  processEmailOutboxBatch,
  type EmailOutboxMetrics,
  type EmailOutboxVisibleRow
} from "../src/email-outbox";
import type { OrderRecord } from "../src/orders";

const baseOrder: OrderRecord = {
  id: "11111111-2222-3333-4444-555555555555",
  userId: "buyer-1",
  userName: "Buyer One",
  userEmail: "buyer@technexus.test",
  userPhone: "+1 555 111 2222",
  shippingAddress: "742 Evergreen Terrace, Springfield",
  shippingCost: 12.5,
  paymentMethod: "cash_on_delivery",
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

const emptyMetrics: EmailOutboxMetrics = {
  total: 0,
  pending: 0,
  sent: 0,
  failed: 0,
  retrying: 0,
  oldestPendingAgeSeconds: null,
  failedAttemptsCount: 0,
  failedLastFiveMinutes: 0
};

const createVisibleRow = (
  overrides: Partial<EmailOutboxVisibleRow> = {}
): EmailOutboxVisibleRow => ({
  id: "aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb",
  orderId: baseOrder.id,
  recipientType: "buyer",
  recipientEmail: baseOrder.userEmail,
  sellerId: null,
  subject: `TechNexus order confirmed #${baseOrder.id}`,
  status: "pending",
  attempts: 0,
  lastError: null,
  nextAttemptAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

const createRepositoryStub = (overrides: Partial<Parameters<typeof __testUtils.setRepository>[0]> = {}) => ({
  async insert() {},
  async listDue() {
    return [];
  },
  async markSent() {},
  async markFailed() {},
  async getMetrics() {
    return emptyMetrics;
  },
  async listVisible() {
    return {
      rows: [],
      total: 0
    };
  },
  async getById() {
    return null;
  },
  async claimById() {
    return null;
  },
  async retryFailed() {
    return 0;
  },
  async resetFailed() {
    return null;
  },
  async cleanupSentOlderThan() {
    return 0;
  },
  ...overrides
});

test.afterEach(() => {
  __testUtils.reset();
});

test("outbox creates one buyer email and one isolated seller email per seller", () => {
  const entries = buildOrderEmailOutboxEntries(baseOrder);
  const buyerEntries = entries.filter((entry) => entry.recipientType === "buyer");
  const sellerAEntry = entries.find(
    (entry) => entry.recipientEmail === "seller-a@technexus.test"
  );
  const sellerBEntry = entries.find(
    (entry) => entry.recipientEmail === "seller-b@technexus.test"
  );
  const adminEntries = entries.filter((entry) => entry.recipientEmail.includes("admin"));

  assert.equal(buyerEntries.length, 1);
  assert.equal(adminEntries.length, 0);
  assert.ok(sellerAEntry);
  assert.ok(sellerBEntry);
  assert.match(buyerEntries[0].html, /Laptop Pro/);
  assert.match(buyerEntries[0].html, /Wireless Mouse/);
  assert.match(sellerAEntry.html, /Laptop Pro/);
  assert.doesNotMatch(sellerAEntry.html, /Wireless Mouse/);
  assert.match(sellerBEntry.html, /Wireless Mouse/);
  assert.doesNotMatch(sellerBEntry.html, /Laptop Pro/);
});

test("metrics overview returns queue counts and visible rows", async () => {
  __testUtils.setRepository(
    createRepositoryStub({
      async getMetrics() {
        return {
          total: 12,
          pending: 4,
          sent: 6,
          failed: 2,
          retrying: 3,
          oldestPendingAgeSeconds: 180,
          failedAttemptsCount: 5,
          failedLastFiveMinutes: 2
        };
      },
      async listVisible() {
        return {
          rows: [createVisibleRow({ status: "failed", attempts: 2, lastError: "ECONNECTION" })],
          total: 1
        };
      }
    })
  );

  const overview = await getEmailOutboxOverview();

  assert.equal(overview.metrics.total, 12);
  assert.equal(overview.metrics.pending, 4);
  assert.equal(overview.metrics.failed, 2);
  assert.equal(overview.metrics.failedLastFiveMinutes, 2);
  assert.equal(overview.rows.length, 1);
  assert.equal(overview.rows[0].status, "failed");
});

test("worker health exposes current status", () => {
  const health = getEmailOutboxWorkerHealth();

  assert.equal(health.status, "down");
  assert.equal(health.isStarted, false);
  assert.equal(health.lastRunAt, null);
});

test("failed emails are retried later with backoff", async () => {
  const entries = buildOrderEmailOutboxEntries(baseOrder);
  const buyerEntry = entries.find((entry) => entry.recipientType === "buyer")!;
  const failedUpdates: Array<{ attempts: number; nextAttemptAt: Date | null; lastError: string }> =
    [];

  __testUtils.setRepository(
    createRepositoryStub({
      async listDue() {
        return [
          {
            ...createVisibleRow(),
            ...buyerEntry,
            status: "pending",
            attempts: 0
          }
        ];
      },
      async markSent() {
        throw new Error("markSent should not be called");
      },
      async markFailed(update) {
        failedUpdates.push(update);
      }
    })
  );

  __testUtils.setDeliverer(async () => ({
    status: "failed",
    errorCode: "ECONNECTION",
    errorMessage: "SMTP down"
  }));

  const startedAt = Date.now();
  const processed = await processEmailOutboxBatch();

  assert.equal(processed, 1);
  assert.equal(failedUpdates.length, 1);
  assert.equal(failedUpdates[0].attempts, 1);
  assert.match(failedUpdates[0].lastError, /ECONNECTION/);
  assert.ok(failedUpdates[0].nextAttemptAt instanceof Date);
  assert.ok(failedUpdates[0].nextAttemptAt!.getTime() > startedAt);
});

test("manual retry sends failed rows immediately", async () => {
  const sentUpdates: Array<{ id: string; attempts: number }> = [];
  const row = createVisibleRow({
    status: "failed",
    attempts: 1,
    recipientType: "seller",
    recipientEmail: "seller-a@technexus.test",
    sellerId: "seller-a"
  });

  __testUtils.setRepository(
    createRepositoryStub({
      async getById() {
        return row;
      },
      async claimById() {
        return { ...row, html: "<p>seller</p>", text: "seller" };
      },
      async markSent(id, attempts) {
        sentUpdates.push({ id, attempts });
      }
    })
  );

  __testUtils.setDeliverer(async () => ({ status: "sent" }));

  const result = await retryEmailOutboxById(row.id);

  assert.equal(result.result, "sent");
  assert.deepEqual(sentUpdates, [{ id: row.id, attempts: 2 }]);
});

test("cleanup job deletes old sent rows in bounded batches", async () => {
  let cleanupArgs: { days: number; limit: number } | null = null;

  __testUtils.setRepository(
    createRepositoryStub({
      async cleanupSentOlderThan(days, limit) {
        cleanupArgs = { days, limit };
        return 27;
      }
    })
  );

  const deleted = await __testUtils.runCleanup();

  assert.equal(deleted, 27);
  assert.deepEqual(cleanupArgs, { days: 7, limit: 500 });
});

test("sent rows are never re-sent by manual retry", async () => {
  const sentRow = createVisibleRow({ status: "sent", attempts: 1 });
  let deliverCalled = false;

  __testUtils.setRepository(
    createRepositoryStub({
      async getById() {
        return sentRow;
      }
    })
  );

  __testUtils.setDeliverer(async () => {
    deliverCalled = true;
    return { status: "sent" };
  });

  const result = await retryEmailOutboxById(sentRow.id);

  assert.equal(result.result, "already_sent");
  assert.equal(deliverCalled, false);
});

test("bulk retry and reset actions are idempotent", async () => {
  const failedRow = createVisibleRow({ status: "failed", attempts: 3 });
  let retryFailedCalls = 0;
  let resetCalls = 0;

  __testUtils.setRepository(
    createRepositoryStub({
      async retryFailed() {
        retryFailedCalls += 1;
        return retryFailedCalls === 1 ? 2 : 2;
      },
      async getById() {
        return failedRow;
      },
      async resetFailed() {
        resetCalls += 1;
        return createVisibleRow({ status: "pending", attempts: 0 });
      }
    })
  );

  const firstBulkRetry = await retryFailedEmailOutboxRows();
  const secondBulkRetry = await retryFailedEmailOutboxRows();
  const firstReset = await resetFailedEmailOutboxRow(failedRow.id);
  const secondReset = await resetFailedEmailOutboxRow(failedRow.id);

  assert.equal(firstBulkRetry.updated, 2);
  assert.equal(secondBulkRetry.updated, 2);
  assert.equal(firstReset.result, "reset");
  assert.equal(secondReset.result, "reset");
  assert.equal(resetCalls, 2);
});
