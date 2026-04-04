const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");

const backendRoot = path.resolve(__dirname, "..");
const envPath = path.resolve(backendRoot, ".env");
const prismaCliPath = path.resolve(backendRoot, "node_modules/prisma/build/index.js");

const loadBackendEnv = () => {
  dotenv.config({ path: envPath });
};

const buildDatabaseUrl = (env = process.env) => {
  if (typeof env.DATABASE_URL === "string" && env.DATABASE_URL.trim().length > 0) {
    return env.DATABASE_URL.trim();
  }

  const host = env.POSTGRES_HOST || "localhost";
  const port = env.POSTGRES_INTERNAL_PORT || env.POSTGRES_PORT || "5433";
  const database = env.POSTGRES_DB || "technexus";
  const user = env.POSTGRES_USER || "technexus";
  const password = env.POSTGRES_PASSWORD || "technexus";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?schema=public`;
};

const initializeDatabaseEnv = (overrides = {}) => {
  loadBackendEnv();
  Object.assign(process.env, overrides);
  process.env.DATABASE_URL = buildDatabaseUrl(process.env);

  return {
    backendRoot,
    envPath,
    databaseUrl: process.env.DATABASE_URL
  };
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

module.exports = {
  backendRoot,
  buildDatabaseUrl,
  createPrismaClient,
  envPath,
  initializeDatabaseEnv,
  loadBackendEnv,
  runPrismaCommand
};
