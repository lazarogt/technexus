import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { apiRequest, buildQuerySuffix } from "../lib/api";
import type {
  EmailOutboxFilters,
  EmailOutboxOverview,
  EmailOutboxWorkerHealth,
  MetricsSnapshot
} from "../lib/types";

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`
});

const opsQueryKey = (
  token: string,
  page: number,
  filters: EmailOutboxFilters
) => ["admin-ops", token, page, filters] as const;

const workerQueryKey = (token: string) => ["admin-ops-worker", token] as const;
const metricsQueryKey = () => ["metrics-json"] as const;

export function useAdminOpsData(
  token: string,
  page: number,
  filters: EmailOutboxFilters,
  refreshIntervalMs: number
) {
  const query = buildQuerySuffix({
    page: String(page),
    limit: "100",
    status: filters.status,
    from: filters.from,
    to: filters.to,
    retryCount: filters.retryCount !== null ? String(filters.retryCount) : null
  });

  const [overviewQuery, workerQuery, metricsQuery] = useQueries({
    queries: [
      {
        queryKey: opsQueryKey(token, page, filters),
        queryFn: () =>
          apiRequest<EmailOutboxOverview>(`/admin/ops/email-outbox${query}`, {
            headers: authHeaders(token)
          }),
        enabled: token.length > 0,
        staleTime: 10_000,
        refetchInterval: refreshIntervalMs > 0 ? refreshIntervalMs : false
      },
      {
        queryKey: workerQueryKey(token),
        queryFn: () =>
          apiRequest<{ worker: EmailOutboxWorkerHealth }>("/admin/ops/worker-health", {
            headers: authHeaders(token)
          }),
        enabled: token.length > 0,
        staleTime: 10_000,
        refetchInterval: refreshIntervalMs > 0 ? refreshIntervalMs : false
      },
      {
        queryKey: metricsQueryKey(),
        queryFn: () => apiRequest<MetricsSnapshot>("/metrics?format=json"),
        staleTime: 10_000,
        refetchInterval: refreshIntervalMs > 0 ? refreshIntervalMs : false
      }
    ]
  });

  return {
    overviewQuery,
    workerQuery,
    metricsQuery
  };
}

export function useRetryFailedEmails(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest<{ updated: number }>("/admin/ops/email-outbox/retry-failed", {
        method: "POST",
        headers: authHeaders(token)
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-ops"] });
      void queryClient.invalidateQueries({ queryKey: ["metrics-json"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-ops-worker"] });
    }
  });
}

export function useRetryEmailRow(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/admin/ops/email-outbox/${id}/retry`, {
        method: "POST",
        headers: authHeaders(token)
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-ops"] });
      void queryClient.invalidateQueries({ queryKey: ["metrics-json"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-ops-worker"] });
    }
  });
}

export function useResetFailedRow(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/admin/ops/email-outbox/${id}/reset-failed`, {
        method: "POST",
        headers: authHeaders(token)
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-ops"] });
      void queryClient.invalidateQueries({ queryKey: ["metrics-json"] });
    }
  });
}
