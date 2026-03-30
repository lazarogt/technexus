const { spawnSync } = require("node:child_process");
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const host = process.env.POSTGRES_HOST || "localhost";
const port = process.env.POSTGRES_INTERNAL_PORT || process.env.POSTGRES_PORT || "5433";
const database = process.env.POSTGRES_DB || "technexus";
const user = process.env.POSTGRES_USER || "technexus";
const password = process.env.POSTGRES_PASSWORD || "technexus";

process.env.DATABASE_URL = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?schema=public`;

const args = process.argv.slice(2);
const prismaCli = path.resolve(process.cwd(), "node_modules/prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, ...args], {
  stdio: "inherit",
  env: process.env
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
