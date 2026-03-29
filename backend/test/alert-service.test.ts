import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateAlerts,
  resetAlertService
} from "../src/services/alert-service";
import type { EmailOutboxMetrics, EmailOutboxWorkerHealth } from "../src/email-outbox";

const metricsBase: EmailOutboxMetrics = {
  total: 0,
  pending: 0,
  sent: 0,
  failed: 0,
  retrying: 0,
  oldestPendingAgeSeconds: null,
  failedAttemptsCount: 0,
  failedLastFiveMinutes: 0
};

const workerBase: EmailOutboxWorkerHealth = {
  isStarted: true,
  isProcessing: false,
  lastRunAt: new Date().toISOString(),
  lastSuccessAt: new Date().toISOString(),
  lastProcessedAt: new Date().toISOString(),
  lastError: null,
  lastProcessedCount: 0,
  processedJobsCount: 0,
  failedJobsCount: 0,
  lastRunDurationMs: 10,
  startedAt: new Date().toISOString(),
  uptimeSeconds: 120,
  secondsSinceLastRun: 5,
  status: "healthy"
};

test.afterEach(() => {
  resetAlertService();
});

test("alert evaluator triggers all configured alert rules", () => {
  const alerts = evaluateAlerts({
    metrics: {
      ...metricsBase,
      pending: 80,
      failedLastFiveMinutes: 6
    },
    workerHealth: {
      ...workerBase,
      secondsSinceLastRun: 61,
      status: "down"
    }
  });

  assert.deepEqual(
    alerts.map((alert) => alert.code).sort(),
    ["failed-emails-threshold", "pending-emails-threshold", "worker-inactive"]
  );
});

test("alert evaluator stays quiet when thresholds are healthy", () => {
  const alerts = evaluateAlerts({
    metrics: metricsBase,
    workerHealth: workerBase
  });

  assert.equal(alerts.length, 0);
});
