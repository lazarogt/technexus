import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";
import pino from "pino";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const bootstrapLogger = pino({
  level: "error",
  messageKey: "message",
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  }
});

const trimString = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}, schema);

const booleanString = (defaultValue: "true" | "false" = "false") =>
  trimString(z.enum(["true", "false"]).default(defaultValue)).transform((value) => value === "true");

const urlString = (protocols: string[]) =>
  trimString(z.string().url()).refine((value) => {
    const parsed = new URL(value);
    return protocols.includes(parsed.protocol);
  });

const bytesLimitString = trimString(z.string().regex(/^\d+\s*(kb|mb|gb)$/i));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  DEMO_MODE: booleanString("false"),
  ANALYTICS_PROVIDER: z.enum(["posthog", "internal"]).default("internal"),
  DATABASE_URL: z.union([urlString(["postgres:", "postgresql:"]), z.literal("")]).optional(),
  POSTGRES_DB: trimString(z.string().min(1)).default("technexus"),
  TEST_POSTGRES_DB: trimString(z.string().min(1)).optional(),
  TEST_POSTGRES_PORT: z.coerce.number().int().positive().optional(),
  POSTGRES_USER: trimString(z.string().min(1)).default("technexus"),
  POSTGRES_PASSWORD: trimString(z.string().min(1)).default("technexus"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  BACKEND_PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_PORT: z.coerce.number().int().positive().default(3000),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_ENABLED: booleanString("false"),
  REDIS_URL: z.union([urlString(["redis:", "rediss:"]), z.literal("")]).optional(),
  JWT_SECRET: trimString(z.string().min(1)),
  JWT_EXPIRES_IN: trimString(z.string().min(1)).default("7d"),
  CORS_ORIGIN: trimString(z.string().min(1)).default("http://localhost:5173,http://127.0.0.1:5173"),
  REQUEST_BODY_LIMIT: bytesLimitString.default("2mb"),
  URLENCODED_PARAMETER_LIMIT: z.coerce.number().int().positive().max(1_000).default(100),
  EMAIL_ENABLED: booleanString("false"),
  EMAIL_FROM: trimString(z.string().min(1)).default("no-reply@technexus.local"),
  SMTP_HOST: trimString(z.string().min(1)).default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: trimString(z.string().min(1)).default("demo"),
  SMTP_PASS: trimString(z.string().min(1)).default("demo"),
  SMTP_FROM: trimString(z.string().min(1)).default("TechNexus <no-reply@technexus.local>"),
  SMTP_SECURE: booleanString("false"),
  MAILHOG_UI_PORT: z.coerce.number().int().positive().default(8025),
  CACHE_TTL_PRODUCTS: z.coerce.number().int().positive().default(120),
  CACHE_TTL_CATEGORIES: z.coerce.number().int().positive().default(300),
  CACHE_TTL_PROFILE: z.coerce.number().int().positive().default(90),
  CACHE_TTL_SEARCH: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
  DB_MAX_RETRIES: z.coerce.number().int().positive().default(30),
  DB_RETRY_DELAY_MS: z.coerce.number().int().positive().default(2_000),
  PASSWORD_SALT_ROUNDS: z.coerce.number().int().positive().default(12),
  TECHNEXUS_ADMIN_EMAIL: trimString(z.string().email()).default("admin@example.com"),
  TECHNEXUS_ADMIN_PASSWORD: trimString(z.string().min(8)).default("DemoAdmin123!")
});

const parsedEnvResult = envSchema.safeParse(process.env);

if (!parsedEnvResult.success) {
  const details = parsedEnvResult.error.issues
    .map((issue) => {
      const key = issue.path.length > 0 ? issue.path.join(".") : "environment";
      return `- ${key}: ${issue.message}`;
    })
    .join("\n");

  bootstrapLogger.error({ details }, "Invalid environment configuration");
  throw new Error("Invalid environment configuration");
}

const parsedEnv = parsedEnvResult.data;

const parseCorsAllowedOrigins = (value: string) =>
  Array.from(
    new Set(
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map((origin) => {
          const parsed = new URL(origin);

          if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new Error("CORS_ORIGIN entries must use http or https.");
          }

          return parsed.origin;
        })
    )
  );

const isWeakSecret = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized.length < 32 || new Set([
    "changeme",
    "change-me",
    "default",
    "secret",
    "jwt-secret",
    "test-jwt-secret",
    "technexus-local-docker-jwt-secret-2026",
    "replace-with-a-long-random-secret-at-least-32-characters"
  ]).has(normalized);
};

const corsAllowedOrigins = parseCorsAllowedOrigins(parsedEnv.CORS_ORIGIN);

if (parsedEnv.NODE_ENV === "production" && isWeakSecret(parsedEnv.JWT_SECRET)) {
  bootstrapLogger.error("JWT_SECRET is too weak for production.");
  throw new Error("Invalid production JWT_SECRET.");
}

const postgresHost = process.env.POSTGRES_HOST ?? "localhost";
const postgresRuntimePort = Number(
  parsedEnv.NODE_ENV === "test"
    ? process.env.TEST_POSTGRES_PORT ?? process.env.POSTGRES_INTERNAL_PORT ?? parsedEnv.POSTGRES_PORT
    : process.env.POSTGRES_INTERNAL_PORT ?? parsedEnv.POSTGRES_PORT
);
const resolvedPostgresDb =
  parsedEnv.NODE_ENV === "test"
    ? parsedEnv.TEST_POSTGRES_DB ?? `${parsedEnv.POSTGRES_DB}_test`
    : parsedEnv.POSTGRES_DB;
const databaseUrl =
  parsedEnv.DATABASE_URL && parsedEnv.DATABASE_URL.length > 0
    ? parsedEnv.DATABASE_URL
    : `postgresql://${encodeURIComponent(parsedEnv.POSTGRES_USER)}:${encodeURIComponent(parsedEnv.POSTGRES_PASSWORD)}@${postgresHost}:${postgresRuntimePort}/${resolvedPostgresDb}?schema=public`;
const redisUrl =
  parsedEnv.REDIS_URL && parsedEnv.REDIS_URL.length > 0
    ? parsedEnv.REDIS_URL
    : `redis://localhost:${parsedEnv.REDIS_PORT}`;

const resolveUploadsDir = () => {
  const preferredUploadsDir = process.env.UPLOADS_DIR ?? path.resolve(process.cwd(), "uploads");

  try {
    fs.mkdirSync(preferredUploadsDir, { recursive: true });
    fs.accessSync(preferredUploadsDir, fs.constants.W_OK);
    return preferredUploadsDir;
  } catch {
    const fallbackUploadsDir = path.join(os.tmpdir(), "technexus-uploads");
    fs.mkdirSync(fallbackUploadsDir, { recursive: true });
    bootstrapLogger.error(
      {
        preferredUploadsDir,
        fallbackUploadsDir
      },
      "Uploads directory is not writable, using fallback path"
    );
    return fallbackUploadsDir;
  }
};

export const env = {
  ...parsedEnv,
  isDevelopment: parsedEnv.NODE_ENV === "development",
  isTest: parsedEnv.NODE_ENV === "test",
  isProduction: parsedEnv.NODE_ENV === "production",
  demoMode: parsedEnv.DEMO_MODE,
  logLevel: parsedEnv.LOG_LEVEL ?? (parsedEnv.NODE_ENV === "production" ? "info" : "debug"),
  testPostgresDb: parsedEnv.TEST_POSTGRES_DB ?? `${parsedEnv.POSTGRES_DB}_test`,
  testPostgresPort: parsedEnv.TEST_POSTGRES_PORT ?? parsedEnv.POSTGRES_PORT,
  postgresHost,
  postgresRuntimePort,
  databaseUrl,
  redisUrl,
  corsAllowedOrigins,
  uploadsDir: resolveUploadsDir(),
  guestSessionDays: 7,
  outboxBatchSize: 10,
  outboxIntervalMs: 30_000,
  lowStockDefaultThreshold: 5
} as const;
