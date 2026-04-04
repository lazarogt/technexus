import { createApp } from "./app";
import { env } from "./utils/config";
import { logger } from "./utils/logger";
import { bootstrapApplication, shutdownApplication } from "./services/bootstrap.service";
import { initializeEmailService } from "./services/email.service";

const app = createApp();

async function start() {
  logger.info(
    {
      nodeEnv: env.NODE_ENV,
      port: env.BACKEND_PORT,
      postgresHost: env.postgresHost,
      redisEnabled: env.REDIS_ENABLED
    },
    "Environment configuration loaded"
  );

  await bootstrapApplication();
  await initializeEmailService();

  const server = app.listen(env.BACKEND_PORT, "0.0.0.0", () => {
    logger.info({ port: env.BACKEND_PORT }, "TechNexus backend listening");
  });

  const close = async () => {
    server.close(async () => {
      await shutdownApplication();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    void close();
  });
  process.on("SIGTERM", () => {
    void close();
  });
}

void start().catch((error) => {
  logger.error(
    { error: error instanceof Error ? error.message : "Unknown startup error" },
    "Unable to start backend"
  );
  process.exit(1);
});
