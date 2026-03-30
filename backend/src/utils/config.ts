import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive(),
  BACKEND_PORT: z.coerce.number().int().positive(),
  FRONTEND_PORT: z.coerce.number().int().positive(),
  REDIS_PORT: z.coerce.number().int().positive(),
  REDIS_ENABLED: z
    .string()
    .transform((value) => value === "true")
    .default("false"),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(1),
  SMTP_SECURE: z
    .string()
    .transform((value) => value === "true")
    .default("false"),
  MAILHOG_UI_PORT: z.coerce.number().int().positive(),
  CACHE_TTL_PRODUCTS: z.coerce.number().int().positive(),
  CACHE_TTL_CATEGORIES: z.coerce.number().int().positive(),
  CACHE_TTL_PROFILE: z.coerce.number().int().positive(),
  CACHE_TTL_SEARCH: z.coerce.number().int().positive(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive(),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive(),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive(),
  DB_MAX_RETRIES: z.coerce.number().int().positive(),
  DB_RETRY_DELAY_MS: z.coerce.number().int().positive(),
  PASSWORD_SALT_ROUNDS: z.coerce.number().int().positive(),
  TECHNEXUS_ADMIN_EMAIL: z.string().email(),
  TECHNEXUS_ADMIN_PASSWORD: z.string().min(8)
});

const parsedEnv = envSchema.parse(process.env);

const postgresHost = process.env.POSTGRES_HOST ?? "localhost";
const postgresRuntimePort = Number(
  process.env.POSTGRES_INTERNAL_PORT ?? parsedEnv.POSTGRES_PORT
);

export const env = {
  ...parsedEnv,
  isDevelopment: parsedEnv.NODE_ENV === "development",
  isTest: parsedEnv.NODE_ENV === "test",
  isProduction: parsedEnv.NODE_ENV === "production",
  postgresHost,
  postgresRuntimePort,
  databaseUrl: `postgresql://${encodeURIComponent(parsedEnv.POSTGRES_USER)}:${encodeURIComponent(parsedEnv.POSTGRES_PASSWORD)}@${postgresHost}:${postgresRuntimePort}/${parsedEnv.POSTGRES_DB}?schema=public`,
  redisUrl: process.env.REDIS_URL ?? `redis://localhost:${parsedEnv.REDIS_PORT}`,
  uploadsDir: path.resolve(process.cwd(), "uploads"),
  guestSessionDays: 7,
  outboxBatchSize: 10,
  outboxIntervalMs: 30_000,
  lowStockDefaultThreshold: 5
} as const;

