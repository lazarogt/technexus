const startedAtMs = Date.now();

// NOTE:
// Metrics are instance-local and reset on container restart.
// For multi-instance deployments, use Prometheus aggregation.
const runtimeMetrics = {
  totalRequests: 0,
  errorCount: 0
};

const getUptimeSeconds = () => Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));

export const recordRequest = () => {
  runtimeMetrics.totalRequests += 1;
};

export const recordError = () => {
  runtimeMetrics.errorCount += 1;
};

export const getRuntimeMetricsSnapshot = () => ({
  uptime: getUptimeSeconds(),
  totalRequests: runtimeMetrics.totalRequests,
  errorCount: runtimeMetrics.errorCount
});

export const resetRuntimeMetrics = () => {
  runtimeMetrics.totalRequests = 0;
  runtimeMetrics.errorCount = 0;
};
