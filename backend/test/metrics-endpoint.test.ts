import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { createApp } from "../src/app";
import { __testUtils } from "../src/email-outbox";
import {
  recordEmailProcessingTime,
  recordEmailRetry,
  recordEmailSendFailure,
  recordEmailSendSuccess
} from "../src/services/metrics-service";
import type { EmailOutboxMetrics } from "../src/email-outbox";

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

test.afterEach(() => {
  __testUtils.reset();
});

test("metrics endpoint exposes prometheus-compatible observability data", async () => {
  __testUtils.setRepository({
    async insert() {},
    async listDue() {
      return [];
    },
    async markSent() {},
    async markFailed() {},
    async getMetrics() {
      return {
        ...emptyMetrics,
        total: 20,
        pending: 3,
        sent: 15,
        failed: 2
      };
    },
    async listVisible() {
      return { rows: [], total: 0 };
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
    }
  });

  recordEmailSendSuccess();
  recordEmailSendFailure();
  recordEmailRetry(2);
  recordEmailProcessingTime(100);
  recordEmailProcessingTime(200);

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Unable to determine test server address");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/metrics`);
    const text = await response.text();

    assert.equal(response.status, 200);
    assert.match(text, /email_outbox_total 20/);
    assert.match(text, /email_outbox_pending 3/);
    assert.match(text, /email_outbox_failed 2/);
    assert.match(text, /email_outbox_sent 15/);
    assert.match(text, /email_send_success_total 1/);
    assert.match(text, /email_send_failure_total 1/);
    assert.match(text, /email_retry_total 2/);
    assert.match(text, /avg_email_processing_time_ms 150/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
