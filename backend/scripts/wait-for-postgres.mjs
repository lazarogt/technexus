import pg from "pg";

const { Client } = pg;

const host = process.env.DB_HOST ?? "postgres";
const port = Number(process.env.DB_PORT ?? 5432);
const user = process.env.DB_USER ?? "technexus";
const password = process.env.DB_PASSWORD ?? "technexus";
const database = process.env.DB_NAME ?? "technexus";
const maxRetries = Number(process.env.DB_MAX_RETRIES ?? 30);
const retryDelayMs = Number(process.env.DB_RETRY_DELAY_MS ?? 2000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
  const client = new Client({ host, port, user, password, database });

  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    console.log(`PostgreSQL is ready on ${host}:${port}.`);
    process.exit(0);
  } catch (error) {
    console.log(
      `Waiting for PostgreSQL (${attempt}/${maxRetries}) at ${host}:${port}...`
    );

    try {
      await client.end();
    } catch {
      // Ignore close errors while retrying startup.
    }

    if (attempt === maxRetries) {
      console.error("PostgreSQL did not become ready in time.", error);
      process.exit(1);
    }

    await sleep(retryDelayMs);
  }
}
