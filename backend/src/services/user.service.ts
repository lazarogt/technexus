import { UserRole } from "@prisma/client";
import { prisma } from "./prisma.service";
import { toPublicUser } from "../models/user.model";
import { AppError } from "../utils/errors";
import { getPagination, toPaginationMeta } from "../utils/pagination";

export const listUsers = async (input: { page?: unknown; limit?: unknown; role?: string }) => {
  const pagination = getPagination(input.page, input.limit, 20);
  const role =
    input.role && ["admin", "seller", "customer"].includes(input.role)
      ? (input.role as UserRole)
      : undefined;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(role ? { role } : {})
      },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.pageSize
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        ...(role ? { role } : {})
      }
    })
  ]);

  return {
    users: users.map(toPublicUser),
    pagination: toPaginationMeta(pagination, total)
  };
};

export const getUserById = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null
    }
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User was not found.");
  }

  return toPublicUser(user);
};

export const createManagedUser = async (input: {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}) => {
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role
    }
  });

  return toPublicUser(user);
};

export const updateUser = async (
  actorUserId: string,
  userId: string,
  input: {
    name?: string;
    email?: string;
    role?: UserRole;
    isBlocked?: boolean;
  }
) => {
  const existing = await prisma.user.findUnique({ where: { id: userId } });

  if (!existing || existing.deletedAt) {
    throw new AppError(404, "USER_NOT_FOUND", "User was not found.");
  }

  const nextRole = input.role ?? existing.role;
  const nextIsBlocked = input.isBlocked ?? existing.isBlocked;

  if (actorUserId === userId && (nextRole !== UserRole.admin || nextIsBlocked)) {
    throw new AppError(
      400,
      "INVALID_SELF_UPDATE",
      "Admins cannot block themselves or remove their own admin role."
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name?.trim() ?? existing.name,
      email: input.email?.trim().toLowerCase() ?? existing.email,
      role: nextRole,
      isBlocked: nextIsBlocked
    }
  });

  return toPublicUser(user);
};

export const softDeleteUser = async (actorUserId: string, userId: string) => {
  if (actorUserId === userId) {
    throw new AppError(400, "INVALID_SELF_DELETE", "Admins cannot delete themselves.");
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });

  if (!existing || existing.deletedAt) {
    throw new AppError(404, "USER_NOT_FOUND", "User was not found.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      isBlocked: true
    }
  });
};

