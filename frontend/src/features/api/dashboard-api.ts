import { apiFetch } from "@/features/api/http";
import type { AnalyticsOverview, AnalyticsRange, DashboardMetrics, WorkerHealth } from "@/features/api/types";

export function getMetrics() {
  return apiFetch<DashboardMetrics>("/api/metrics", {
    searchParams: { format: "json" }
  });
}

export function getWorkerHealth(token: string) {
  return apiFetch<{ worker: WorkerHealth }>("/api/orders/admin/outbox/worker-health", {
    token
  });
}

export function getAnalyticsOverview(token: string, range: AnalyticsRange) {
  return apiFetch<AnalyticsOverview>("/api/admin/analytics/overview", {
    token,
    searchParams: { range }
  });
}
