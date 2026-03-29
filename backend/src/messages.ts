import pool from "./db";
import type { UserRole } from "./users";

export type MessageRecord = {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: UserRole;
  orderId: string | null;
  subject: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type MessageListResult = {
  messages: MessageRecord[];
  unreadCount: number;
};

type FlatMessageRow = MessageRecord;

const messageSelection = `
  m.id,
  sender.id AS "senderId",
  sender.name AS "senderName",
  sender.email AS "senderEmail",
  sender.role AS "senderRole",
  recipient.id AS "recipientId",
  recipient.name AS "recipientName",
  recipient.email AS "recipientEmail",
  recipient.role AS "recipientRole",
  m.order_id AS "orderId",
  m.subject,
  m.body,
  m.read_at AS "readAt",
  m.created_at AS "createdAt"
`;

export const createMessage = async (input: {
  senderId: string;
  recipientId: string;
  orderId?: string | null;
  subject: string;
  body: string;
}): Promise<MessageRecord> => {
  const result = await pool.query<FlatMessageRow>(
    `
      WITH inserted_message AS (
        INSERT INTO technexus.messages (
          sender_id,
          recipient_id,
          order_id,
          subject,
          body
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      )
      SELECT ${messageSelection.replaceAll("m.", "inserted_message.")}
      FROM inserted_message
      INNER JOIN technexus.users sender ON sender.id = inserted_message.sender_id
      INNER JOIN technexus.users recipient ON recipient.id = inserted_message.recipient_id
    `,
    [
      input.senderId,
      input.recipientId,
      input.orderId ?? null,
      input.subject.trim(),
      input.body.trim()
    ]
  );

  return result.rows[0];
};

export const listMessagesForUser = async (input: {
  userId: string;
  contactId?: string | null;
  markAsRead?: boolean;
}): Promise<MessageListResult> => {
  if (input.markAsRead) {
    await pool.query(
      `
        UPDATE technexus.messages
        SET read_at = NOW()
        WHERE recipient_id = $1
          AND read_at IS NULL
          AND ($2::uuid IS NULL OR sender_id = $2)
      `,
      [input.userId, input.contactId ?? null]
    );
  }

  const messagesResult = await pool.query<FlatMessageRow>(
    `
      SELECT ${messageSelection}
      FROM technexus.messages m
      INNER JOIN technexus.users sender ON sender.id = m.sender_id
      INNER JOIN technexus.users recipient ON recipient.id = m.recipient_id
      WHERE (m.sender_id = $1 OR m.recipient_id = $1)
        AND (
          $2::uuid IS NULL OR (
            (m.sender_id = $1 AND m.recipient_id = $2) OR
            (m.sender_id = $2 AND m.recipient_id = $1)
          )
        )
      ORDER BY m.created_at DESC
    `,
    [input.userId, input.contactId ?? null]
  );

  const unreadResult = await pool.query<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM technexus.messages
      WHERE recipient_id = $1
        AND read_at IS NULL
    `,
    [input.userId]
  );

  return {
    messages: messagesResult.rows,
    unreadCount: Number(unreadResult.rows[0]?.total ?? 0)
  };
};
