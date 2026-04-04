import { createApp } from "./app";
import { env } from "./utils/config";
import { logger } from "./utils/logger";
import { prisma } from "./services/prisma.service";
import { bootstrapApplication, shutdownApplication } from "./services/bootstrap.service";
import { initializeEmailService } from "./services/email.service";

const app = createApp();
let isShuttingDown = false;

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

  const shutdownGracefully = (done: () => void) => {
    if (isShuttingDown) {
      done();
      return;
    }

    isShuttingDown = true;

    const forceExitTimer = setTimeout(() => {
      process.exit(1);
    }, 5_000);
    forceExitTimer.unref();

    server.close(() => {
      shutdownApplication()
        .catch(() => undefined)
        .finally(() => {
          prisma.$disconnect()
            .catch(() => undefined)
            .finally(done);
        });
    });
  };

  process.on("SIGINT", () => {
    logger.info("SIGINT received");
    shutdownGracefully(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received");
    shutdownGracefully(() => process.exit(0));
  });
  process.on("uncaughtException", (error) => {
    logger.fatal(error, "uncaughtException");
    shutdownGracefully(() => process.exit(1));
  });
  process.on("unhandledRejection", (reason) => {
    logger.fatal(reason, "unhandledRejection");
    shutdownGracefully(() => process.exit(1));
  });
}

void start().catch(async (error) => {
  logger.error(
    { error: error instanceof Error ? error.message : "Unknown startup error" },
    "Unable to start backend"
  );
  await shutdownApplication().catch(() => undefined);
  process.exit(1);
});
