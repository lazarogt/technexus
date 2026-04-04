const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");

const backendRoot = path.resolve(__dirname, "..");
const envPath = path.resolve(backendRoot, ".env");
const prismaCliPath = path.resolve(backendRoot, "node_modules/prisma/build/index.js");

const loadBackendEnv = () => {
  dotenv.config({ path: envPath });
};

const getBaseDatabaseName = (env = process.env) => env.POSTGRES_DB || "technexus";

const getEffectiveDatabaseName = (env = process.env) => {
  if (env.NODE_ENV === "test") {
    return env.TEST_POSTGRES_DB || `${getBaseDatabaseName(env)}_test`;
  }

  return getBaseDatabaseName(env);
};

const buildConnectionDetails = (env = process.env) => {
  const host = env.POSTGRES_HOST || "localhost";
  const port =
    env.NODE_ENV === "test"
      ? env.TEST_POSTGRES_PORT || env.POSTGRES_INTERNAL_PORT || env.POSTGRES_PORT || "5432"
      : env.POSTGRES_INTERNAL_PORT || env.POSTGRES_PORT || "5433";
  const database = getEffectiveDatabaseName(env);
  const user = env.POSTGRES_USER || "technexus";
  const password = env.POSTGRES_PASSWORD || "technexus";

  return {
    host,
    port,
    database,
    user,
    password
  };
};

const buildDatabaseUrl = (env = process.env) => {
  if (typeof env.DATABASE_URL === "string" && env.DATABASE_URL.trim().length > 0) {
    return env.DATABASE_URL.trim();
  }

  const { host, port, database, user, password } = buildConnectionDetails(env);

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?schema=public`;
};

const buildAdminDatabaseUrl = (env = process.env) => {
  const { host, port, user, password } = buildConnectionDetails(env);
  const adminDatabase = env.POSTGRES_ADMIN_DB || "postgres";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${adminDatabase}?schema=public`;
};

const calculateRetryDelayMs = (attempt, baseDelayMs, maxDelayMs = Math.max(baseDelayMs, 10_000)) => {
  const normalizedAttempt = Math.max(1, attempt);
  const exponentialDelay = baseDelayMs * 2 ** (normalizedAttempt - 1);

  return Math.min(exponentialDelay, maxDelayMs);
};

const sleep = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, "\"\"")}"`;

const resolveRuntimeDatabaseConfig = (env = process.env) => {
  const explicitDatabaseUrl =
    typeof env.DATABASE_URL === "string" && env.DATABASE_URL.trim().length > 0
      ? env.DATABASE_URL.trim()
      : "";
  const databaseUrl = explicitDatabaseUrl || buildDatabaseUrl(env);
  const parsedDatabaseUrl = new URL(databaseUrl);
  const databaseName = parsedDatabaseUrl.pathname.replace(/^\//, "") || getEffectiveDatabaseName(env);

  return {
    databaseUrl,
    databaseName,
    explicitDatabaseUrl,
    isTest: env.NODE_ENV === "test"
  };
};

const initializeDatabaseEnv = (overrides = {}) => {
  loadBackendEnv();
  Object.assign(process.env, overrides);
  const runtimeConfig = resolveRuntimeDatabaseConfig(process.env);
  process.env.DATABASE_URL = runtimeConfig.databaseUrl;
  process.env.POSTGRES_DB = runtimeConfig.databaseName;

  return {
    backendRoot,
    envPath,
    databaseUrl: process.env.DATABASE_URL,
    databaseName: runtimeConfig.databaseName,
    explicitDatabaseUrl: runtimeConfig.explicitDatabaseUrl,
    isTest: runtimeConfig.isTest
  };
};

const ensureDatabaseExists = async (prisma, databaseName) => {
  const existingDatabase = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    databaseName
  );

  if (Array.isArray(existingDatabase) && existingDatabase.length > 0) {
    return;
  }

  await prisma.$executeRawUnsafe(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
};

const waitForDatabaseReady = async (options = {}) => {
  const runtimeConfig = initializeDatabaseEnv(options.env);
  const retries = Number(process.env.DB_MAX_RETRIES || 10);
  const baseDelayMs = Number(process.env.DB_RETRY_DELAY_MS || 1_000);
  const adminDatabaseUrl = buildAdminDatabaseUrl(process.env);
  const { PrismaClient } = require("@prisma/client");

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: adminDatabaseUrl
        }
      },
      log: ["error"]
    });

    try {
      await prisma.$connect();
      await prisma.$queryRawUnsafe("SELECT 1");

      if (runtimeConfig.isTest) {
        await ensureDatabaseExists(prisma, runtimeConfig.databaseName);
      }

      return runtimeConfig;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      await sleep(calculateRetryDelayMs(attempt, baseDelayMs));
    } finally {
      await prisma.$disconnect().catch(() => undefined);
    }
  }

  return runtimeConfig;
};

const runPrismaCommand = (args, options = {}) => {
  const envOverrides = options.env ?? {};
  initializeDatabaseEnv(envOverrides);

  return spawnSync(process.execPath, [prismaCliPath, ...args], {
    cwd: backendRoot,
    stdio: "inherit",
    env: process.env
  });
};

const createPrismaClient = (options = {}) => {
  const { databaseUrl } = initializeDatabaseEnv(options.env);
  const { PrismaClient } = require("@prisma/client");

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    ...(options.log ? { log: options.log } : {})
  });
};

const runMigrateDeployAndGenerate = async (options = {}) => {
  await waitForDatabaseReady(options);

  const migrateResult = runPrismaCommand(["migrate", "deploy"], options);

  if (typeof migrateResult.status !== "number" || migrateResult.status !== 0) {
    throw new Error("Prisma migrate deploy failed.");
  }

  const generateResult = runPrismaCommand(["generate"], options);

  if (typeof generateResult.status !== "number" || generateResult.status !== 0) {
    throw new Error("Prisma generate failed.");
  }
};

module.exports = {
  backendRoot,
  buildAdminDatabaseUrl,
  buildDatabaseUrl,
  calculateRetryDelayMs,
  createPrismaClient,
  envPath,
  initializeDatabaseEnv,
  loadBackendEnv,
  runMigrateDeployAndGenerate,
  runPrismaCommand,
  waitForDatabaseReady
};
