import { createLogger } from "../lib/logger";
import type { EmailOutboxMetrics, EmailOutboxWorkerHealth } from "../email-outbox";

export type AlertSeverity = "warning" | "critical";
export type AlertCode =
  | "failed-emails-threshold"
  | "pending-emails-threshold"
  | "worker-inactive";

export type AlertRecord = {
  code: AlertCode;
  severity: AlertSeverity;
  message: string;
  triggeredAt: string;
  context: Record<string, unknown>;
};

type AlertEvaluatorInput = {
  metrics: EmailOutboxMetrics;
  workerHealth: EmailOutboxWorkerHealth;
};

type AlertProvider = () => Promise<AlertEvaluatorInput>;

const ALERT_CHECK_INTERVAL_MS = 60_000;
const FAILED_EMAILS_WINDOW_THRESHOLD = 5;
const PENDING_EMAILS_THRESHOLD = 50;
const WORKER_INACTIVE_THRESHOLD_SECONDS = 60;

const logger = createLogger("outbox");

let activeAlerts: AlertRecord[] = [];
let alertProvider: AlertProvider | null = null;
let alertHandle: NodeJS.Timeout | null = null;

const buildAlert = (
  code: AlertCode,
  severity: AlertSeverity,
  message: string,
  context: Record<string, unknown>
): AlertRecord => ({
  code,
  severity,
  message,
  triggeredAt: new Date().toISOString(),
  context
});

export const evaluateAlerts = ({
  metrics,
  workerHealth
}: AlertEvaluatorInput): AlertRecord[] => {
  const alerts: AlertRecord[] = [];

  if (metrics.failedLastFiveMinutes > FAILED_EMAILS_WINDOW_THRESHOLD) {
    alerts.push(
      buildAlert("failed-emails-threshold", "critical", "ALERT", {
        reason: "failed emails in last 5 minutes exceeded threshold",
        failedEmailsLastFiveMinutes: metrics.failedLastFiveMinutes,
        threshold: FAILED_EMAILS_WINDOW_THRESHOLD
      })
    );
  }

  if (metrics.pending > PENDING_EMAILS_THRESHOLD) {
    alerts.push(
      buildAlert("pending-emails-threshold", "warning", "ALERT", {
        reason: "pending emails exceeded threshold",
        pendingEmails: metrics.pending,
        threshold: PENDING_EMAILS_THRESHOLD
      })
    );
  }

  if (workerHealth.secondsSinceLastRun > WORKER_INACTIVE_THRESHOLD_SECONDS) {
    alerts.push(
      buildAlert("worker-inactive", "critical", "ALERT", {
        reason: "worker inactive for too long",
        secondsSinceLastRun: workerHealth.secondsSinceLastRun,
        threshold: WORKER_INACTIVE_THRESHOLD_SECONDS,
        lastRunAt: workerHealth.lastRunAt
      })
    );
  }

  return alerts;
};

export const getActiveAlerts = (): AlertRecord[] => activeAlerts.map((alert) => ({ ...alert }));

export const runAlertEvaluation = async (): Promise<AlertRecord[]> => {
  if (!alertProvider) {
    return getActiveAlerts();
  }

  const nextAlerts = evaluateAlerts(await alertProvider());
  const previousCodes = new Set(activeAlerts.map((alert) => alert.code));

  nextAlerts.forEach((alert) => {
    if (!previousCodes.has(alert.code)) {
      logger.warn(alert.message, {
        alertCode: alert.code,
        severity: alert.severity,
        ...alert.context
      });
    }
  });

  activeAlerts = nextAlerts;
  return getActiveAlerts();
};

export const configureAlertService = (provider: AlertProvider): void => {
  alertProvider = provider;
};

export const startAlertScheduler = (): void => {
  if (alertHandle) {
    return;
  }

  const tick = async () => {
    try {
      await runAlertEvaluation();
    } catch (error) {
      logger.error("Alert evaluation failed", {
        error: error instanceof Error ? error.message : "Unknown alert evaluation error"
      });
    }
  };

  void tick();

  alertHandle = setInterval(() => {
    void tick();
  }, ALERT_CHECK_INTERVAL_MS);

  if (typeof alertHandle.unref === "function") {
    alertHandle.unref();
  }
};

export const stopAlertScheduler = (): void => {
  if (!alertHandle) {
    return;
  }

  clearInterval(alertHandle);
  alertHandle = null;
};

export const resetAlertService = (): void => {
  activeAlerts = [];
  alertProvider = null;
  stopAlertScheduler();
};
