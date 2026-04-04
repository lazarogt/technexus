import { asyncHandler } from "../utils/async-handler";
import { getHealthStatus } from "../services/health.service";
import { getRuntimeMetricsSnapshot } from "../services/observability.service";

export const health = asyncHandler(async (_req, res) => {
  const status = await getHealthStatus();
  res.status(status.db === "up" ? 200 : 503).json(status);
});

export const observabilityMetrics = asyncHandler(async (_req, res) => {
  res.status(200).json(getRuntimeMetricsSnapshot());
});
