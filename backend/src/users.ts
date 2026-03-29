import pool from "./db";

export const userRoles = ["customer", "seller", "admin"] as const;

export type UserRole = (typeof userRoles)[number];

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt?: string;
};

export type PublicUser = Omit<UserRecord, "password">;

const publicUserFields = `
  id,
  name,
  email,
  role,
  is_blocked AS "isBlocked",
  created_at AS "createdAt"
`;

export const isUserRole = (value: string): value is UserRole => {
  return userRoles.includes(value as UserRole);
};

export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export const toPublicUser = (user: UserRecord): PublicUser => {
  const { password, ...publicUser } = user;
  return publicUser;
};

export const createUser = async (input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<UserRecord> => {
  const result = await pool.query<UserRecord>(
    `
      INSERT INTO technexus.users (name, email, password, role, is_blocked)
      VALUES ($1, $2, $3, $4, FALSE)
      RETURNING
        id,
        name,
        email,
        password,
        role,
        is_blocked AS "isBlocked",
        created_at AS "createdAt"
    `,
    [input.name.trim(), sanitizeEmail(input.email), input.password, input.role]
  );

  return result.rows[0];
};

export const findUserByEmail = async (
  email: string
): Promise<UserRecord | null> => {
  const result = await pool.query<UserRecord>(
    `
      SELECT
        id,
        name,
        email,
        password,
        role,
        is_blocked AS "isBlocked",
        created_at AS "createdAt"
      FROM technexus.users
      WHERE email = $1
      LIMIT 1
    `,
    [sanitizeEmail(email)]
  );

  return result.rows[0] ?? null;
};

export const findPublicUserById = async (
  userId: string
): Promise<PublicUser | null> => {
  const result = await pool.query<PublicUser>(
    `
      SELECT ${publicUserFields}
      FROM technexus.users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
};

export const findUserById = async (userId: string): Promise<UserRecord | null> => {
  const result = await pool.query<UserRecord>(
    `
      SELECT
        id,
        name,
        email,
        password,
        role,
        is_blocked AS "isBlocked",
        created_at AS "createdAt"
      FROM technexus.users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
};

export const listAllUsers = async (): Promise<PublicUser[]> => {
  const result = await pool.query<PublicUser>(
    `
      SELECT ${publicUserFields}
      FROM technexus.users
      ORDER BY created_at DESC
    `
  );

  return result.rows;
};

export const listSellerUsers = async (): Promise<PublicUser[]> => {
  const result = await pool.query<PublicUser>(
    `
      SELECT ${publicUserFields}
      FROM technexus.users
      WHERE role = 'seller'
      ORDER BY created_at DESC
    `
  );

  return result.rows;
};

export const updateUserById = async (
  userId: string,
  input: {
    name: string;
    email: string;
    role: UserRole;
    isBlocked: boolean;
  }
): Promise<PublicUser | null> => {
  const result = await pool.query<PublicUser>(
    `
      UPDATE technexus.users
      SET
        name = $2,
        email = $3,
        role = $4,
        is_blocked = $5
      WHERE id = $1
      RETURNING ${publicUserFields}
    `,
    [userId, input.name.trim(), sanitizeEmail(input.email), input.role, input.isBlocked]
  );

  return result.rows[0] ?? null;
};

export const deleteUserById = async (userId: string): Promise<boolean> => {
  const result = await pool.query(
    `
      DELETE FROM technexus.users
      WHERE id = $1
    `,
    [userId]
  );

  return (result.rowCount ?? 0) > 0;
};
