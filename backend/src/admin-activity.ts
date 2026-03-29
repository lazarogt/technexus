import pool from "./db";

export const recordAdminActivity = async (input: {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details: Record<string, unknown>;
}): Promise<void> => {
  await pool.query(
    `
      INSERT INTO technexus.admin_activity_logs (
        admin_id,
        action,
        entity_type,
        entity_id,
        details
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [
      input.adminId,
      input.action,
      input.entityType,
      input.entityId ?? null,
      JSON.stringify(input.details)
    ]
  );
};
