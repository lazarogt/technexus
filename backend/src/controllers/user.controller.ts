import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { asyncHandler } from "../utils/async-handler";
import { env } from "../utils/config";
import { cacheService } from "../services/cache.service";
import { listUsers, getUserById, createManagedUser, updateUser, softDeleteUser } from "../services/user.service";
import { idParamSchema, userListQuerySchema } from "../utils/request-validation";

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole)
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isBlocked: z.boolean().optional()
});

export const indexUsers = asyncHandler(async (req, res) => {
  const query = userListQuerySchema.parse(req.query);
  const response = await listUsers({
    page: query.page,
    limit: query.limit ?? query.pageSize,
    role: query.role
  });

  res.status(200).json(response);
});

export const showUser = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  const user = await getUserById(params.id);
  res.status(200).json({ user });
});

export const storeUser = asyncHandler(async (req, res) => {
  const payload = createUserSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(payload.password, env.PASSWORD_SALT_ROUNDS);
  const user = await createManagedUser({
    ...payload,
    passwordHash
  });
  res.status(201).json({ user });
});

export const updateManagedUser = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  const payload = updateUserSchema.parse(req.body);
  const userId = params.id;
  const user = await updateUser(req.actor!.userId!, userId, payload);
  await cacheService.invalidatePrefix(`profile:${userId}`);
  res.status(200).json({ user });
});

export const destroyUser = asyncHandler(async (req, res) => {
  const params = idParamSchema.parse(req.params);
  const userId = params.id;
  await softDeleteUser(req.actor!.userId!, userId);
  await cacheService.invalidatePrefix(`profile:${userId}`);
  res.status(200).json({ message: "User deleted successfully." });
});
