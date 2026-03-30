import { z } from "zod";
import { UserRole } from "@prisma/client";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { cacheService } from "../services/cache.service";
import {
  createGuestAccess,
  getProfileById,
  loginUser,
  registerUser
} from "../services/auth.service";
import { env } from "../utils/config";

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole).default(UserRole.customer)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const register = asyncHandler(async (req, res) => {
  const payload = registerSchema.parse(req.body);
  const result = await registerUser(payload);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const result = await loginUser(payload);
  res.status(200).json(result);
});

export const createGuest = asyncHandler(async (_req, res) => {
  const result = await createGuestAccess();
  res.status(201).json(result);
});

export const profile = asyncHandler(async (req, res) => {
  if (!req.actor || req.actor.type !== "user" || !req.actor.userId) {
    throw new AppError(401, "AUTH_REQUIRED", "Authentication token is required.");
  }

  const cacheKey = `profile:${req.actor.userId}`;
  const user = await cacheService.remember(cacheKey, env.CACHE_TTL_PROFILE, async () =>
    getProfileById(req.actor!.userId!)
  );
  res.status(200).json({ user });
});

