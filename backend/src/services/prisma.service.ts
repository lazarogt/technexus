import { PrismaClient } from "@prisma/client";
import { env } from "../utils/config";
import { logger } from "../utils/logger";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.databaseUrl
    }
  },
  log: env.isDevelopment ? ["warn", "error"] : ["error"]
});

export const connectDatabase = async () => {
  for (let attempt = 1; attempt <= env.DB_MAX_RETRIES; attempt += 1) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      logger.info({ attempt }, "Database connection established");
      return;
    } catch (error) {
      logger.error(
        {
          attempt,
          error: error instanceof Error ? error.message : "Unknown database error"
        },
        "Database connection failed"
      );

      if (attempt === env.DB_MAX_RETRIES) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, env.DB_RETRY_DELAY_MS));
    }
  }
};

