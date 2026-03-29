import type { EmailOutboxMetrics, EmailOutboxWorkerHealth } from "../email-outbox";

export type RuntimeMetricsSnapshot = {
  emailSendSuccessTotal: number;
  emailSendFailureTotal: number;
  emailRetryTotal: number;
  totalEmailProcessingTimeMs: number;
  processedEmailCount: number;
};

export type MetricsSnapshot = {
  email_outbox_total: number;
  email_outbox_pending: number;
  email_outbox_failed: number;
  email_outbox_sent: number;
  email_send_success_total: number;
  email_send_failure_total: number;
  email_retry_total: number;
  worker_uptime_seconds: number;
  avg_email_processing_time_ms: number;
};

const runtimeMetrics: RuntimeMetricsSnapshot = {
  emailSendSuccessTotal: 0,
  emailSendFailureTotal: 0,
  emailRetryTotal: 0,
  totalEmailProcessingTimeMs: 0,
  processedEmailCount: 0
};

export const recordEmailSendSuccess = (): void => {
  runtimeMetrics.emailSendSuccessTotal += 1;
};

export const recordEmailSendFailure = (): void => {
  runtimeMetrics.emailSendFailureTotal += 1;
};

export const recordEmailRetry = (count = 1): void => {
  runtimeMetrics.emailRetryTotal += count;
};

export const recordEmailProcessingTime = (durationMs: number): void => {
  runtimeMetrics.totalEmailProcessingTimeMs += durationMs;
  runtimeMetrics.processedEmailCount += 1;
};

export const getRuntimeMetrics = (): RuntimeMetricsSnapshot => ({
  ...runtimeMetrics
});

export const buildMetricsSnapshot = (
  outboxMetrics: EmailOutboxMetrics,
  workerHealth: EmailOutboxWorkerHealth,
  runtime = getRuntimeMetrics()
): MetricsSnapshot => ({
  email_outbox_total: outboxMetrics.total,
  email_outbox_pending: outboxMetrics.pending,
  email_outbox_failed: outboxMetrics.failed,
  email_outbox_sent: outboxMetrics.sent,
  email_send_success_total: runtime.emailSendSuccessTotal,
  email_send_failure_total: runtime.emailSendFailureTotal,
  email_retry_total: runtime.emailRetryTotal,
  worker_uptime_seconds: workerHealth.uptimeSeconds,
  avg_email_processing_time_ms:
    runtime.processedEmailCount === 0
      ? 0
      : Number((runtime.totalEmailProcessingTimeMs / runtime.processedEmailCount).toFixed(2))
});

export const renderPrometheusMetrics = (snapshot: MetricsSnapshot): string => {
  return Object.entries(snapshot)
    .map(([key, value]) => `${key} ${value}`)
    .join("\n");
};

export const resetRuntimeMetrics = (): void => {
  runtimeMetrics.emailSendSuccessTotal = 0;
  runtimeMetrics.emailSendFailureTotal = 0;
  runtimeMetrics.emailRetryTotal = 0;
  runtimeMetrics.totalEmailProcessingTimeMs = 0;
  runtimeMetrics.processedEmailCount = 0;
};
