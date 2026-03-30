import { connectDatabase } from "./prisma.service";
import { cacheService } from "./cache.service";
import { logger } from "../utils/logger";
import { startOutboxWorker, stopOutboxWorker } from "./outbox.service";
import { prisma } from "./prisma.service";

export const bootstrapApplication = async () => {
  await connectDatabase();
  await cacheService.connect();
  startOutboxWorker();
};

export const shutdownApplication = async () => {
  stopOutboxWorker();
  await cacheService.disconnect();
  await prisma.$disconnect();
  logger.info("Application shutdown complete");
};
