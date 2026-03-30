import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { prisma } from "./prisma.service";
import { env } from "../utils/config";
import { AppError } from "../utils/errors";
import { toPublicUser } from "../models/user.model";

type UserTokenPayload = {
  type: "user";
  sub: string;
  role: UserRole;
};

type GuestTokenPayload = {
  type: "guest";
  sub: string;
};

export type AuthTokenPayload = UserTokenPayload | GuestTokenPayload;

const signToken = (payload: AuthTokenPayload) =>
  jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  });

export const verifyToken = (token: string): AuthTokenPayload =>
  jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;

export const registerUser = async (input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) => {
  if (!["customer", "seller"].includes(input.role)) {
    throw new AppError(
      403,
      "FORBIDDEN_ROLE",
      "Public registration is available only for customer and seller roles."
    );
  }

  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new AppError(409, "EMAIL_IN_USE", "A user with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, env.PASSWORD_SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      role: input.role
    }
  });

  return {
    token: signToken({ type: "user", sub: user.id, role: user.role }),
    user: toPublicUser(user)
  };
};

export const loginUser = async (input: { email: string; password: string }) => {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.deletedAt) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  if (user.isBlocked) {
    throw new AppError(403, "ACCOUNT_BLOCKED", "This account is blocked.");
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  return {
    token: signToken({ type: "user", sub: user.id, role: user.role }),
    user: toPublicUser(user)
  };
};

export const createGuestAccess = async () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.guestSessionDays);

  const session = await prisma.guestSession.create({
    data: {
      expiresAt
    }
  });

  return {
    token: signToken({ type: "guest", sub: session.id }),
    guestSessionId: session.id,
    expiresAt: session.expiresAt.toISOString()
  };
};

export const getProfileById = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null
    }
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User profile was not found.");
  }

  return toPublicUser(user);
};
