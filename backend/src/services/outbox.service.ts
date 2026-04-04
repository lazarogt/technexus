import { EmailOutboxStatus, type EmailOutbox } from "@prisma/client";
import { prisma } from "./prisma.service";
import { sendEmail } from "./email.service";
import {
  buildBuyerOrderEmail,
  buildSellerOrderEmail,
  buildStatusUpdatedEmail,
  groupOrderItemsBySeller,
  type EmailOrderRecord
} from "./notification.service";
import { toOutboxRowDto } from "../models/outbox.model";
import { env } from "../utils/config";
import { logger } from "../utils/logger";
import { getRuntimeMetricsSnapshot } from "./observability.service";

type WorkerState = {
  isStarted: boolean;
  isProcessing: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastProcessedAt: string | null;
  lastError: string | null;
  lastProcessedCount: number;
  processedJobsCount: number;
  failedJobsCount: number;
  lastRunDurationMs: number | null;
  startedAt: string | null;
};

type OutboxMetrics = {
  email_outbox_total: number;
  email_outbox_pending: number;
  email_outbox_failed: number;
  email_outbox_sent: number;
};

const workerState: WorkerState = {
  isStarted: false,
  isProcessing: false,
  lastRunAt: null,
  lastSuccessAt: null,
  lastProcessedAt: null,
  lastError: null,
  lastProcessedCount: 0,
  processedJobsCount: 0,
  failedJobsCount: 0,
  lastRunDurationMs: null,
  startedAt: null
};

let handle: NodeJS.Timeout | null = null;

const retryDelayMs = (attempts: number) => {
  if (attempts <= 1) {
    return 60_000;
  }

  if (attempts === 2) {
    return 5 * 60_000;
  }

  return 15 * 60_000;
};

const maxAttempts = 3;

const getSecondsSince = (isoDate: string | null) =>
  isoDate ? Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)) : 0;

const getWorkerHealth = () => ({
  ...workerState,
  uptimeSeconds: getSecondsSince(workerState.startedAt),
  secondsSinceLastRun: getSecondsSince(workerState.lastRunAt),
  status:
    !workerState.isStarted
      ? "down"
      : workerState.lastError
        ? "degraded"
        : "healthy"
});

const enqueueEntry = async (entry: Omit<EmailOutbox, "id" | "createdAt" | "updatedAt">) => {
  await prisma.emailOutbox.create({
    data: entry
  });
};

export const enqueueOrderCreatedEmails = async (order: EmailOrderRecord) => {
  const buyerEmail = buildBuyerOrderEmail(order);
  await enqueueEntry({
    orderId: order.id,
    recipientType: "buyer",
    recipientEmail: order.userEmail,
    sellerId: null,
    subject: `TechNexus order confirmed #${order.id}`,
    html: buyerEmail.html,
    text: buyerEmail.text,
    status: "pending",
    attempts: 0,
    lastError: null,
    nextAttemptAt: new Date()
  });

  for (const group of groupOrderItemsBySeller(order)) {
    if (!group.sellerEmail.trim()) {
      continue;
    }

    const sellerEmail = buildSellerOrderEmail(order, group);
    await enqueueEntry({
      orderId: order.id,
      recipientType: "seller",
      recipientEmail: group.sellerEmail,
      sellerId: group.sellerId,
      subject: `TechNexus new order #${order.id}`,
      html: sellerEmail.html,
      text: sellerEmail.text,
      status: "pending",
      attempts: 0,
      lastError: null,
      nextAttemptAt: new Date()
    });
  }
};

export const enqueueOrderStatusUpdatedEmail = async (
  order: EmailOrderRecord,
  previousStatus: EmailOrderRecord["status"]
) => {
  const email = buildStatusUpdatedEmail(order, previousStatus);
  await enqueueEntry({
    orderId: order.id,
    recipientType: "buyer",
    recipientEmail: order.userEmail,
    sellerId: null,
    subject: `TechNexus order ${order.id.slice(0, 8)} is now ${order.status}`,
    html: email.html,
    text: email.text,
    status: "pending",
    attempts: 0,
    lastError: null,
    nextAttemptAt: new Date()
  });
};

export const processOutboxBatch = async () => {
  const dueRows = await prisma.emailOutbox.findMany({
    where: {
      status: {
        in: [EmailOutboxStatus.pending, EmailOutboxStatus.failed]
      },
      attempts: {
        lt: maxAttempts
      },
      nextAttemptAt: {
        lte: new Date()
      }
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: env.outboxBatchSize
  });

  let processed = 0;

  for (const row of dueRows) {
    const result = await sendEmail({
      to: row.recipientEmail,
      subject: row.subject,
      html: row.html,
      text: row.text
    });

    if (result.status === "disabled") {
      break;
    }

    processed += 1;
    workerState.lastProcessedAt = new Date().toISOString();

    if (result.status === "sent") {
      await prisma.emailOutbox.update({
        where: { id: row.id },
        data: {
          status: "sent",
          attempts: row.attempts + 1,
          lastError: null
        }
      });
      continue;
    }

    workerState.failedJobsCount += 1;
    const attempts = row.attempts + 1;
    await prisma.emailOutbox.update({
      where: { id: row.id },
      data: {
        status: "failed",
        attempts,
        lastError: result.errorMessage,
        nextAttemptAt:
          attempts >= maxAttempts ? null : new Date(Date.now() + retryDelayMs(attempts))
      }
    });
  }

  return processed;
};

const runWorker = async () => {
  if (workerState.isProcessing) {
    return;
  }

  workerState.isProcessing = true;
  workerState.lastRunAt = new Date().toISOString();
  const startedAt = Date.now();

  try {
    const processed = await processOutboxBatch();
    workerState.lastSuccessAt = new Date().toISOString();
    workerState.lastError = null;
    workerState.lastProcessedCount = processed;
    workerState.processedJobsCount += processed;
    workerState.lastRunDurationMs = Date.now() - startedAt;
  } catch (error) {
    workerState.lastError = error instanceof Error ? error.message : "Unknown worker error";
    workerState.lastRunDurationMs = Date.now() - startedAt;
    logger.error({ error: workerState.lastError }, "Outbox worker failed");
  } finally {
    workerState.isProcessing = false;
  }
};

export const startOutboxWorker = () => {
  if (handle) {
    return;
  }

  workerState.isStarted = true;
  workerState.startedAt = new Date().toISOString();
  void runWorker();
  handle = setInterval(() => {
    void runWorker();
  }, env.outboxIntervalMs);
};

export const stopOutboxWorker = () => {
  if (handle) {
    clearInterval(handle);
    handle = null;
  }
};

export const getOutboxOverview = async (input: {
  page?: number;
  limit?: number;
  status?: "pending" | "sent" | "failed" | null;
}) => {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const where = {
    ...(input.status ? { status: input.status } : {})
  };

  const [rows, total] = await Promise.all([
    prisma.emailOutbox.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { nextAttemptAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.emailOutbox.count({ where })
  ]);

  return {
    metrics: await getMetricsSnapshot(),
    rows: rows.map(toOutboxRowDto),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasPreviousPage: page > 1,
      hasNextPage: page * limit < total
    },
    filters: {
      status: input.status ?? null,
      from: null,
      to: null,
      retryCount: null
    },
    alerts: []
  };
};

export const retryOutboxById = async (id: string) => {
  const row = await prisma.emailOutbox.findUnique({ where: { id } });

  if (!row) {
    return { result: "not_found", row: null };
  }

  if (row.status === "sent") {
    return { result: "already_sent", row: toOutboxRowDto(row) };
  }

  if (row.attempts >= maxAttempts) {
    return { result: "max_attempts_reached", row: toOutboxRowDto(row) };
  }

  await prisma.emailOutbox.update({
    where: { id },
    data: {
      status: "pending",
      nextAttemptAt: new Date()
    }
  });
  await runWorker();

  return {
    result: "scheduled",
    row: toOutboxRowDto((await prisma.emailOutbox.findUniqueOrThrow({ where: { id } })))
  };
};

export const retryFailedOutboxRows = async () => {
  const result = await prisma.emailOutbox.updateMany({
    where: {
      status: "failed",
      attempts: {
        lt: maxAttempts
      }
    },
    data: {
      status: "pending",
      nextAttemptAt: new Date()
    }
  });

  return {
    updated: result.count
  };
};

export const resetFailedOutboxRow = async (id: string) => {
  const row = await prisma.emailOutbox.findUnique({ where: { id } });

  if (!row) {
    return { result: "not_found", row: null };
  }

  if (row.status === "sent") {
    return { result: "already_sent", row: toOutboxRowDto(row) };
  }

  if (row.status !== "failed") {
    return { result: "not_failed", row: toOutboxRowDto(row) };
  }

  const updated = await prisma.emailOutbox.update({
    where: { id },
    data: {
      status: "pending",
      attempts: 0,
      lastError: null,
      nextAttemptAt: new Date()
    }
  });

  return { result: "reset", row: toOutboxRowDto(updated) };
};

export const getMetricsSnapshot = async (): Promise<OutboxMetrics> => {
  const [total, pending, failed, sent] = await Promise.all([
    prisma.emailOutbox.count(),
    prisma.emailOutbox.count({ where: { status: "pending" } }),
    prisma.emailOutbox.count({ where: { status: "failed" } }),
    prisma.emailOutbox.count({ where: { status: "sent" } })
  ]);

  return {
    email_outbox_total: total,
    email_outbox_pending: pending,
    email_outbox_failed: failed,
    email_outbox_sent: sent
  };
};

export const getPrometheusMetrics = async () => {
  const metrics = await getMetricsSnapshot();
  const runtimeMetrics = getRuntimeMetricsSnapshot();

  return [
    "# HELP email_outbox_total Total email outbox rows",
    "# TYPE email_outbox_total gauge",
    `email_outbox_total ${metrics.email_outbox_total}`,
    "# HELP email_outbox_pending Pending email outbox rows",
    "# TYPE email_outbox_pending gauge",
    `email_outbox_pending ${metrics.email_outbox_pending}`,
    "# HELP email_outbox_failed Failed email outbox rows",
    "# TYPE email_outbox_failed gauge",
    `email_outbox_failed ${metrics.email_outbox_failed}`,
    "# HELP email_outbox_sent Sent email outbox rows",
    "# TYPE email_outbox_sent gauge",
    `email_outbox_sent ${metrics.email_outbox_sent}`,
    "# HELP technexus_uptime_seconds Backend process uptime in seconds",
    "# TYPE technexus_uptime_seconds counter",
    `technexus_uptime_seconds ${runtimeMetrics.uptime}`,
    "# HELP technexus_http_requests_total Total HTTP requests handled by the backend",
    "# TYPE technexus_http_requests_total counter",
    `technexus_http_requests_total ${runtimeMetrics.totalRequests}`,
    "# HELP technexus_http_errors_total Total HTTP errors handled by the backend",
    "# TYPE technexus_http_errors_total counter",
    `technexus_http_errors_total ${runtimeMetrics.errorCount}`
  ].join("\n");
};

export const getOutboxWorkerHealth = () => getWorkerHealth();
