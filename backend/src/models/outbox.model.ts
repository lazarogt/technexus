import type { EmailOutbox } from "@prisma/client";

export const toOutboxRowDto = (row: EmailOutbox) => ({
  id: row.id,
  orderId: row.orderId,
  recipientType: row.recipientType,
  recipientEmail: row.recipientEmail,
  sellerId: row.sellerId,
  subject: row.subject,
  status: row.status,
  attempts: row.attempts,
  lastError: row.lastError,
  nextAttemptAt: row.nextAttemptAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});
