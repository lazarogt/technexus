import type { PoolClient } from "pg";
import pool from "./db";
import {
  buildBuyerOrderEmail,
  buildSellerOrderEmail,
  deliverEmailNotification,
  groupOrderItemsBySeller,
  type EmailDeliveryResult,
  type EmailNotificationPayload
} from "./email";
import { createLogger } from "./lib/logger";
import type { OrderRecord } from "./orders";
import {
  configureAlertService,
  getActiveAlerts,
  startAlertScheduler,
  stopAlertScheduler,
  type AlertRecord
} from "./services/alert-service";
import {
  buildMetricsSnapshot,
  recordEmailProcessingTime,
  recordEmailRetry,
  renderPrometheusMetrics,
  resetRuntimeMetrics
} from "./services/metrics-service";

export type EmailOutboxStatus = "pending" | "sent" | "failed";
export type EmailOutboxRecipientType = "buyer" | "seller";

export type EmailOutboxEntry = {
  orderId: string;
  recipientType: EmailOutboxRecipientType;
  recipientEmail: string;
  sellerId: string | null;
  subject: string;
  html: string;
  text: string;
};

export type EmailOutboxMetrics = {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  retrying: number;
  oldestPendingAgeSeconds: number | null;
  failedAttemptsCount: number;
  failedLastFiveMinutes: number;
};

export type EmailOutboxVisibleRow = {
  id: string;
  orderId: string;
  recipientType: EmailOutboxRecipientType;
  recipientEmail: string;
  sellerId: string | null;
  subject: string;
  status: EmailOutboxStatus;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailOutboxFilters = {
  status: EmailOutboxStatus | null;
  from: string | null;
  to: string | null;
  retryCount: number | null;
};

export type EmailOutboxPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type EmailOutboxRow = EmailOutboxEntry & {
  id: string;
  status: EmailOutboxStatus;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type EmailOutboxOverview = {
  metrics: EmailOutboxMetrics;
  rows: EmailOutboxVisibleRow[];
  pagination: EmailOutboxPagination;
  filters: EmailOutboxFilters;
  alerts: AlertRecord[];
};

export type EmailOutboxWorkerHealth = {
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
  uptimeSeconds: number;
  secondsSinceLastRun: number;
  status: "healthy" | "degraded" | "down";
};

export type EmailOutboxActionResult =
  | "not_found"
  | "already_sent"
  | "max_attempts_reached"
  | "scheduled"
  | "sent"
  | "failed"
  | "reset"
  | "not_failed";

type EmailOutboxActionResponse = {
  result: EmailOutboxActionResult;
  row: EmailOutboxVisibleRow | null;
};

type ListVisibleInput = {
  limit: number;
  offset: number;
  filters: EmailOutboxFilters;
};

type EmailOutboxRepository = {
  insert(entries: EmailOutboxEntry[]): Promise<void>;
  listDue(limit: number): Promise<EmailOutboxRow[]>;
  markSent(id: string, attempts: number): Promise<void>;
  markFailed(input: {
    id: string;
    attempts: number;
    lastError: string;
    nextAttemptAt: Date | null;
  }): Promise<void>;
  getMetrics(): Promise<EmailOutboxMetrics>;
  listVisible(input: ListVisibleInput): Promise<{
    rows: EmailOutboxVisibleRow[];
    total: number;
  }>;
  getById(id: string): Promise<EmailOutboxVisibleRow | null>;
  claimById(id: string): Promise<EmailOutboxRow | null>;
  retryFailed(): Promise<number>;
  resetFailed(id: string): Promise<EmailOutboxVisibleRow | null>;
  cleanupSentOlderThan(days: number, limit: number): Promise<number>;
};

type EmailOutboxDeliverer = (
  payload: EmailNotificationPayload
) => Promise<EmailDeliveryResult>;

type Queryable = Pick<PoolClient, "query">;

const MAX_EMAIL_ATTEMPTS = 3;
const EMAIL_OUTBOX_BATCH_SIZE = 10;
const EMAIL_OUTBOX_INTERVAL_MS = 30_000;
const OUTBOX_CLEANUP_INTERVAL_MS = 60 * 60_000;
const OUTBOX_CLEANUP_DAYS = 7;
const OUTBOX_CLEANUP_LIMIT = 500;

const logger = createLogger("outbox");
const workerLogger = createLogger("email-worker");

const workerState = {
  isStarted: false,
  isProcessing: false,
  lastRunAt: null as string | null,
  lastSuccessAt: null as string | null,
  lastProcessedAt: null as string | null,
  lastError: null as string | null,
  lastProcessedCount: 0,
  processedJobsCount: 0,
  failedJobsCount: 0,
  lastRunDurationMs: null as number | null,
  startedAt: null as string | null
};

let repository: EmailOutboxRepository;
let deliverer: EmailOutboxDeliverer = (payload) =>
  deliverEmailNotification({ ...payload, service: "email-worker" });
let workerHandle: NodeJS.Timeout | null = null;
let cleanupHandle: NodeJS.Timeout | null = null;

const getRetryDelayMs = (attempts: number): number => {
  if (attempts <= 1) {
    return 60_000;
  }

  if (attempts === 2) {
    return 5 * 60_000;
  }

  return 15 * 60_000;
};

const buildNextAttemptAt = (attempts: number, now = new Date()): Date | null => {
  if (attempts >= MAX_EMAIL_ATTEMPTS) {
    return null;
  }

  return new Date(now.getTime() + getRetryDelayMs(attempts));
};

const mapVisibleRowSelection = `
  id,
  order_id AS "orderId",
  recipient_type AS "recipientType",
  recipient_email AS "recipientEmail",
  seller_id AS "sellerId",
  subject,
  status,
  attempts,
  last_error AS "lastError",
  next_attempt_at AS "nextAttemptAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const buildListVisibleWhere = (
  filters: EmailOutboxFilters,
  parameters: unknown[]
): string => {
  const clauses = ["1 = 1"];

  if (filters.status) {
    parameters.push(filters.status);
    clauses.push(`status = $${parameters.length}`);
  }

  if (filters.from) {
    parameters.push(filters.from);
    clauses.push(`created_at >= $${parameters.length}::timestamptz`);
  }

  if (filters.to) {
    parameters.push(filters.to);
    clauses.push(`created_at <= $${parameters.length}::timestamptz`);
  }

  if (filters.retryCount !== null) {
    parameters.push(filters.retryCount);
    clauses.push(`attempts = $${parameters.length}`);
  }

  return clauses.join(" AND ");
};

export const buildOrderEmailOutboxEntries = (order: OrderRecord): EmailOutboxEntry[] => {
  const entries: EmailOutboxEntry[] = [];
  const buyerEmail = buildBuyerOrderEmail(order);

  if (order.userEmail.trim()) {
    entries.push({
      orderId: order.id,
      recipientType: "buyer",
      recipientEmail: order.userEmail,
      sellerId: null,
      subject: `TechNexus order confirmed #${order.id}`,
      html: buyerEmail.html,
      text: buyerEmail.text
    });
  }

  for (const sellerGroup of groupOrderItemsBySeller(order)) {
    if (!sellerGroup.sellerEmail.trim()) {
      continue;
    }

    const sellerEmail = buildSellerOrderEmail(order, sellerGroup);

    entries.push({
      orderId: order.id,
      recipientType: "seller",
      recipientEmail: sellerGroup.sellerEmail,
      sellerId: sellerGroup.sellerId,
      subject: `TechNexus new order #${order.id}`,
      html: sellerEmail.html,
      text: sellerEmail.text
    });
  }

  return entries;
};

const insertEntriesWithClient = async (
  client: Queryable,
  entries: EmailOutboxEntry[]
): Promise<void> => {
  for (const entry of entries) {
    await client.query(
      `
        INSERT INTO technexus.email_outbox (
          order_id,
          recipient_type,
          recipient_email,
          seller_id,
          subject,
          html,
          text,
          status,
          attempts,
          next_attempt_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `,
      [
        entry.orderId,
        entry.recipientType,
        entry.recipientEmail,
        entry.sellerId,
        entry.subject,
        entry.html,
        entry.text
      ]
    );
  }
};

const databaseRepository: EmailOutboxRepository = {
  async insert(entries) {
    await insertEntriesWithClient(pool, entries);
  },

  async listDue(limit) {
    const result = await pool.query<EmailOutboxRow>(
      `
        WITH claimable AS (
          SELECT outbox.id
          FROM technexus.email_outbox outbox
          WHERE outbox.status IN ('pending', 'failed')
            AND outbox.attempts < $1
            AND outbox.next_attempt_at <= NOW()
          ORDER BY outbox.next_attempt_at ASC, outbox.created_at ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE technexus.email_outbox outbox
        SET
          next_attempt_at = NOW() + INTERVAL '30 seconds',
          updated_at = NOW()
        FROM claimable
        WHERE outbox.id = claimable.id
        RETURNING
          outbox.id,
          outbox.order_id AS "orderId",
          outbox.recipient_type AS "recipientType",
          outbox.recipient_email AS "recipientEmail",
          outbox.seller_id AS "sellerId",
          outbox.subject,
          outbox.html,
          outbox.text,
          outbox.status,
          outbox.attempts,
          outbox.last_error AS "lastError",
          outbox.next_attempt_at AS "nextAttemptAt"
      `,
      [MAX_EMAIL_ATTEMPTS, limit]
    );

    return result.rows;
  },

  async markSent(id, attempts) {
    await pool.query(
      `
        UPDATE technexus.email_outbox
        SET
          status = 'sent',
          attempts = $2,
          last_error = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [id, attempts]
    );
  },

  async markFailed({ id, attempts, lastError, nextAttemptAt }) {
    await pool.query(
      `
        UPDATE technexus.email_outbox
        SET
          status = 'failed',
          attempts = $2,
          last_error = $3,
          next_attempt_at = $4,
          updated_at = NOW()
        WHERE id = $1
      `,
      [id, attempts, lastError, nextAttemptAt]
    );
  },

  async getMetrics() {
    const result = await pool.query<EmailOutboxMetrics>(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
          COUNT(*) FILTER (
            WHERE status IN ('pending', 'failed')
              AND attempts > 0
              AND attempts < $1
          )::int AS retrying,
          CASE
            WHEN COUNT(*) FILTER (WHERE status = 'pending') = 0 THEN NULL
            ELSE FLOOR(
              EXTRACT(EPOCH FROM NOW() - MIN(created_at) FILTER (WHERE status = 'pending'))
            )::int
          END AS "oldestPendingAgeSeconds",
          COALESCE(SUM(attempts) FILTER (WHERE status = 'failed'), 0)::int AS "failedAttemptsCount",
          COUNT(*) FILTER (
            WHERE status = 'failed'
              AND updated_at >= NOW() - INTERVAL '5 minutes'
          )::int AS "failedLastFiveMinutes"
        FROM technexus.email_outbox
      `,
      [MAX_EMAIL_ATTEMPTS]
    );

    return (
      result.rows[0] ?? {
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
        retrying: 0,
        oldestPendingAgeSeconds: null,
        failedAttemptsCount: 0,
        failedLastFiveMinutes: 0
      }
    );
  },

  async listVisible({ limit, offset, filters }) {
    const filterParameters: unknown[] = [];
    const whereClause = buildListVisibleWhere(filters, filterParameters);
    const countResult = await pool.query<{ total: number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM technexus.email_outbox
        WHERE ${whereClause}
      `,
      filterParameters
    );

    const parameters = [...filterParameters, limit, offset];
    const result = await pool.query<EmailOutboxVisibleRow>(
      `
        SELECT ${mapVisibleRowSelection}
        FROM technexus.email_outbox
        WHERE ${whereClause}
        ORDER BY
          created_at DESC,
          next_attempt_at ASC NULLS LAST
        LIMIT $${filterParameters.length + 1}
        OFFSET $${filterParameters.length + 2}
      `,
      parameters
    );

    return {
      rows: result.rows,
      total: countResult.rows[0]?.total ?? 0
    };
  },

  async getById(id) {
    const result = await pool.query<EmailOutboxVisibleRow>(
      `
        SELECT ${mapVisibleRowSelection}
        FROM technexus.email_outbox
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] ?? null;
  },

  async claimById(id) {
    const result = await pool.query<EmailOutboxRow>(
      `
        WITH claimable AS (
          SELECT outbox.id
          FROM technexus.email_outbox outbox
          WHERE outbox.id = $1
            AND outbox.status IN ('pending', 'failed')
            AND outbox.attempts < $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE technexus.email_outbox outbox
        SET
          next_attempt_at = NOW() + INTERVAL '30 seconds',
          updated_at = NOW()
        FROM claimable
        WHERE outbox.id = claimable.id
        RETURNING
          outbox.id,
          outbox.order_id AS "orderId",
          outbox.recipient_type AS "recipientType",
          outbox.recipient_email AS "recipientEmail",
          outbox.seller_id AS "sellerId",
          outbox.subject,
          outbox.html,
          outbox.text,
          outbox.status,
          outbox.attempts,
          outbox.last_error AS "lastError",
          outbox.next_attempt_at AS "nextAttemptAt",
          outbox.created_at AS "createdAt",
          outbox.updated_at AS "updatedAt"
      `,
      [id, MAX_EMAIL_ATTEMPTS]
    );

    return result.rows[0] ?? null;
  },

  async retryFailed() {
    const result = await pool.query(
      `
        UPDATE technexus.email_outbox
        SET
          status = 'pending',
          next_attempt_at = NOW(),
          updated_at = NOW()
        WHERE status = 'failed'
          AND attempts < $1
      `,
      [MAX_EMAIL_ATTEMPTS]
    );

    return result.rowCount ?? 0;
  },

  async resetFailed(id) {
    const result = await pool.query<EmailOutboxVisibleRow>(
      `
        UPDATE technexus.email_outbox
        SET
          status = 'pending',
          attempts = 0,
          last_error = NULL,
          next_attempt_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
          AND status = 'failed'
        RETURNING ${mapVisibleRowSelection}
      `,
      [id]
    );

    return result.rows[0] ?? null;
  },

  async cleanupSentOlderThan(days, limit) {
    const result = await pool.query<{ id: string }>(
      `
        WITH deletable AS (
          SELECT id
          FROM technexus.email_outbox
          WHERE status = 'sent'
            AND updated_at < NOW() - ($1::text || ' days')::interval
          ORDER BY updated_at ASC
          LIMIT $2
        )
        DELETE FROM technexus.email_outbox outbox
        USING deletable
        WHERE outbox.id = deletable.id
        RETURNING outbox.id
      `,
      [days, limit]
    );

    return result.rowCount ?? 0;
  }
};

repository = databaseRepository;

const getLastErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown worker error";

const getSecondsSince = (timestamp: string | null): number => {
  if (!timestamp) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
};

const getWorkerStatus = (): EmailOutboxWorkerHealth["status"] => {
  if (!workerState.isStarted) {
    return "down";
  }

  const secondsSinceLastRun = getSecondsSince(workerState.lastRunAt);

  if (secondsSinceLastRun > 60) {
    return "down";
  }

  if (workerState.lastError) {
    return "degraded";
  }

  return "healthy";
};

const toWorkerHealth = (): EmailOutboxWorkerHealth => ({
  ...workerState,
  uptimeSeconds: getSecondsSince(workerState.startedAt) === Number.MAX_SAFE_INTEGER
    ? 0
    : getSecondsSince(workerState.startedAt),
  secondsSinceLastRun: getSecondsSince(workerState.lastRunAt),
  status: getWorkerStatus()
});

const runCleanup = async (): Promise<number> => {
  const deleted = await repository.cleanupSentOlderThan(OUTBOX_CLEANUP_DAYS, OUTBOX_CLEANUP_LIMIT);

  if (deleted > 0) {
    logger.info("Email outbox cleanup completed", {
      deleted,
      retentionDays: OUTBOX_CLEANUP_DAYS,
      limit: OUTBOX_CLEANUP_LIMIT
    });
  }

  return deleted;
};

const startCleanupJob = (): void => {
  if (cleanupHandle) {
    return;
  }

  cleanupHandle = setInterval(() => {
    void runCleanup().catch((error) => {
      logger.error("Email outbox cleanup failed", {
        error: getLastErrorMessage(error)
      });
    });
  }, OUTBOX_CLEANUP_INTERVAL_MS);

  if (typeof cleanupHandle.unref === "function") {
    cleanupHandle.unref();
  }
};

const stopCleanupJob = (): void => {
  if (!cleanupHandle) {
    return;
  }

  clearInterval(cleanupHandle);
  cleanupHandle = null;
};

export const getEmailOutboxWorkerHealth = (): EmailOutboxWorkerHealth => {
  return toWorkerHealth();
};

export const getEmailOutboxOverview = async (
  input: Partial<{
    page: number;
    limit: number;
    filters: Partial<EmailOutboxFilters>;
  }> = {}
): Promise<EmailOutboxOverview> => {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const filters: EmailOutboxFilters = {
    status: input.filters?.status ?? null,
    from: input.filters?.from ?? null,
    to: input.filters?.to ?? null,
    retryCount: input.filters?.retryCount ?? null
  };

  const [metrics, visible] = await Promise.all([
    repository.getMetrics(),
    repository.listVisible({
      limit,
      offset: (page - 1) * limit,
      filters
    })
  ]);

  return {
    metrics,
    rows: visible.rows,
    pagination: {
      page,
      limit,
      total: visible.total,
      totalPages: Math.max(1, Math.ceil(visible.total / limit)),
      hasNextPage: page * limit < visible.total,
      hasPreviousPage: page > 1
    },
    filters,
    alerts: getActiveAlerts()
  };
};

export const getMetricsSnapshot = async () => {
  return buildMetricsSnapshot(await repository.getMetrics(), getEmailOutboxWorkerHealth());
};

export const getPrometheusMetrics = async (): Promise<string> => {
  return renderPrometheusMetrics(await getMetricsSnapshot());
};

export const enqueueOrderCreatedEmails = async (order: OrderRecord): Promise<void> => {
  const entries = buildOrderEmailOutboxEntries(order);

  if (entries.length === 0) {
    return;
  }

  try {
    await repository.insert(entries);
  } catch (error) {
    logger.error("Unable to enqueue order emails", {
      orderId: order.id,
      error: getLastErrorMessage(error)
    });
  }
};

export const enqueueOrderCreatedEmailsInTransaction = async (
  client: Queryable,
  order: OrderRecord
): Promise<void> => {
  const entries = buildOrderEmailOutboxEntries(order);

  if (entries.length === 0) {
    return;
  }

  await insertEntriesWithClient(client, entries);
};

export const processEmailOutboxBatch = async (
  limit = EMAIL_OUTBOX_BATCH_SIZE
): Promise<number> => {
  const rows = await repository.listDue(limit);

  if (rows.length === 0) {
    return 0;
  }

  let processedCount = 0;

  for (const row of rows) {
    const rowStartedAt = Date.now();
    const result = await deliverer({
      orderId: row.orderId,
      recipientRole: row.recipientType,
      to: row.recipientEmail,
      subject: row.subject,
      html: row.html,
      text: row.text,
      sellerId: row.sellerId
    });

    recordEmailProcessingTime(Date.now() - rowStartedAt);

    if (result.status === "disabled") {
      workerLogger.warn("Email send skipped because SMTP is disabled", {
        orderId: row.orderId,
        recipientEmail: row.recipientEmail,
        recipientType: row.recipientType
      });
      break;
    }

    processedCount += 1;
    workerState.lastProcessedAt = new Date().toISOString();

    if (result.status === "sent") {
      await repository.markSent(row.id, row.attempts + 1);
      continue;
    }

    workerState.failedJobsCount += 1;
    const attempts = row.attempts + 1;
    const nextAttemptAt = buildNextAttemptAt(attempts);
    const lastError = result.errorCode
      ? `${result.errorCode}: ${result.errorMessage}`
      : result.errorMessage;

    recordEmailRetry();

    workerLogger.error("Order email delivery failed; scheduled for retry", {
      orderId: row.orderId,
      recipientType: row.recipientType,
      recipientEmail: row.recipientEmail,
      sellerId: row.sellerId,
      attempts,
      nextAttemptAt: nextAttemptAt?.toISOString() ?? null
    });

    await repository.markFailed({
      id: row.id,
      attempts,
      lastError,
      nextAttemptAt
    });
  }

  return processedCount;
};

export const retryEmailOutboxById = async (
  id: string
): Promise<EmailOutboxActionResponse> => {
  const existingRow = await repository.getById(id);

  if (!existingRow) {
    return { result: "not_found", row: null };
  }

  if (existingRow.status === "sent") {
    logger.info("Manual email outbox retry skipped for sent row", {
      id,
      orderId: existingRow.orderId,
      recipientType: existingRow.recipientType,
      recipientEmail: existingRow.recipientEmail,
      sellerId: existingRow.sellerId
    });
    return { result: "already_sent", row: existingRow };
  }

  if (existingRow.status === "failed" && existingRow.attempts >= MAX_EMAIL_ATTEMPTS) {
    return { result: "max_attempts_reached", row: existingRow };
  }

  const claimedRow = await repository.claimById(id);

  if (!claimedRow) {
    return { result: "scheduled", row: await repository.getById(id) };
  }

  const startedAt = Date.now();
  const result = await deliverer({
    orderId: claimedRow.orderId,
    recipientRole: claimedRow.recipientType,
    to: claimedRow.recipientEmail,
    subject: claimedRow.subject,
    html: claimedRow.html,
    text: claimedRow.text,
    sellerId: claimedRow.sellerId
  });
  recordEmailProcessingTime(Date.now() - startedAt);

  if (result.status === "disabled") {
    logger.warn("Manual email outbox retry deferred because SMTP is disabled", {
      id,
      orderId: claimedRow.orderId,
      recipientType: claimedRow.recipientType,
      recipientEmail: claimedRow.recipientEmail,
      sellerId: claimedRow.sellerId
    });
    return { result: "scheduled", row: await repository.getById(id) };
  }

  if (result.status === "sent") {
    await repository.markSent(claimedRow.id, claimedRow.attempts + 1);
    const row = await repository.getById(id);

    logger.info("Manual email outbox retry succeeded", {
      id,
      orderId: claimedRow.orderId,
      recipientType: claimedRow.recipientType,
      recipientEmail: claimedRow.recipientEmail,
      sellerId: claimedRow.sellerId
    });

    return { result: "sent", row };
  }

  const attempts = claimedRow.attempts + 1;
  const nextAttemptAt = buildNextAttemptAt(attempts);
  const lastError = result.errorCode
    ? `${result.errorCode}: ${result.errorMessage}`
    : result.errorMessage;

  recordEmailRetry();

  await repository.markFailed({
    id: claimedRow.id,
    attempts,
    lastError,
    nextAttemptAt
  });

  logger.error("Manual email outbox retry failed", {
    id,
    orderId: claimedRow.orderId,
    recipientType: claimedRow.recipientType,
    recipientEmail: claimedRow.recipientEmail,
    sellerId: claimedRow.sellerId,
    attempts
  });

  return { result: "failed", row: await repository.getById(id) };
};

export const retryFailedEmailOutboxRows = async (): Promise<{ updated: number }> => {
  const updated = await repository.retryFailed();

  if (updated > 0) {
    recordEmailRetry(updated);
  }

  logger.info("Manual retry requested for failed email outbox rows", {
    updated
  });

  return { updated };
};

export const resetFailedEmailOutboxRow = async (
  id: string
): Promise<EmailOutboxActionResponse> => {
  const existingRow = await repository.getById(id);

  if (!existingRow) {
    return { result: "not_found", row: null };
  }

  if (existingRow.status === "sent") {
    return { result: "already_sent", row: existingRow };
  }

  if (existingRow.status !== "failed") {
    return { result: "not_failed", row: existingRow };
  }

  const row = await repository.resetFailed(id);

  logger.info("Manual failed email outbox row reset", {
    id,
    orderId: existingRow.orderId,
    recipientType: existingRow.recipientType,
    recipientEmail: existingRow.recipientEmail,
    sellerId: existingRow.sellerId
  });

  return { result: "reset", row };
};

export const runEmailOutboxCleanup = async (): Promise<{ deleted: number }> => {
  return {
    deleted: await runCleanup()
  };
};

export const stopEmailOutboxWorker = (): void => {
  if (workerHandle) {
    clearInterval(workerHandle);
    workerHandle = null;
  }

  stopCleanupJob();
  stopAlertScheduler();
  workerState.isStarted = false;
  workerState.isProcessing = false;

  logger.info("Email outbox worker stopped", {
    lastRunAt: workerState.lastRunAt
  });
};

export const startEmailOutboxWorker = (): void => {
  if (workerHandle) {
    return;
  }

  workerState.isStarted = true;
  workerState.startedAt = new Date().toISOString();
  workerState.lastError = null;

  configureAlertService(async () => ({
    metrics: await repository.getMetrics(),
    workerHealth: getEmailOutboxWorkerHealth()
  }));
  startAlertScheduler();
  startCleanupJob();

  workerLogger.info("Email outbox worker started", {
    intervalMs: EMAIL_OUTBOX_INTERVAL_MS,
    batchSize: EMAIL_OUTBOX_BATCH_SIZE
  });

  const runBatch = async () => {
    if (workerState.isProcessing) {
      return;
    }

    workerState.isProcessing = true;
    workerState.lastRunAt = new Date().toISOString();
    const startedAt = Date.now();

    try {
      const processedCount = await processEmailOutboxBatch();
      workerState.lastProcessedCount = processedCount;
      workerState.processedJobsCount += processedCount;
      workerState.lastRunDurationMs = Date.now() - startedAt;
      workerState.lastSuccessAt = new Date().toISOString();
      workerState.lastError = null;

      workerLogger.info("Email outbox worker run completed", {
        processedCount,
        durationMs: workerState.lastRunDurationMs,
        processedJobsCount: workerState.processedJobsCount,
        failedJobsCount: workerState.failedJobsCount
      });
    } catch (error) {
      workerState.lastProcessedCount = 0;
      workerState.lastRunDurationMs = Date.now() - startedAt;
      workerState.lastError = getLastErrorMessage(error);
      workerLogger.error("Email outbox worker error", {
        error: workerState.lastError,
        durationMs: workerState.lastRunDurationMs
      });
    } finally {
      workerState.isProcessing = false;
    }
  };

  void runBatch();

  workerHandle = setInterval(() => {
    void runBatch();
  }, EMAIL_OUTBOX_INTERVAL_MS);

  if (typeof workerHandle.unref === "function") {
    workerHandle.unref();
  }
};

export const __testUtils = {
  buildOrderEmailOutboxEntries,
  buildNextAttemptAt,
  getWorkerHealth: getEmailOutboxWorkerHealth,
  setRepository(nextRepository: EmailOutboxRepository) {
    repository = nextRepository;
  },
  setDeliverer(nextDeliverer: EmailOutboxDeliverer) {
    deliverer = nextDeliverer;
  },
  async runCleanup() {
    return runCleanup();
  },
  reset() {
    repository = databaseRepository;
    deliverer = (payload) => deliverEmailNotification({ ...payload, service: "email-worker" });
    stopEmailOutboxWorker();
    workerState.lastRunAt = null;
    workerState.lastSuccessAt = null;
    workerState.lastProcessedAt = null;
    workerState.lastError = null;
    workerState.lastProcessedCount = 0;
    workerState.processedJobsCount = 0;
    workerState.failedJobsCount = 0;
    workerState.lastRunDurationMs = null;
    workerState.startedAt = null;
    resetRuntimeMetrics();
  }
};
