import { cacheService } from "./cache.service";
import { prisma } from "./prisma.service";
import { getRuntimeMetricsSnapshot } from "./observability.service";

export type HealthStatus = {
  status: "ok" | "degraded";
  db: "up" | "down";
  redis: "up" | "degraded";
  uptime: number;
};

const checkDb = async (): Promise<HealthStatus["db"]> => {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), 1000);
      })
    ]);

    return "up";
  } catch {
    return "down";
  }
};

export const getHealthStatus = async (): Promise<HealthStatus> => {
  const db = await checkDb();

  return {
    status: db === "up" ? "ok" : "degraded",
    db,
    redis: cacheService.getHealthStatus(),
    uptime: getRuntimeMetricsSnapshot().uptime
  };
};
