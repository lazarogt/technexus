import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { UserRole } from "./users";

export type AuthTokenPayload = {
  userId: string;
  role: UserRole;
};

const jwtSecret = process.env.JWT_SECRET ?? "technexus-dev-secret";
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];
const passwordSaltRounds = Number(process.env.PASSWORD_SALT_ROUNDS ?? 12);

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, passwordSaltRounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const signAuthToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, jwtSecret) as AuthTokenPayload;
};
