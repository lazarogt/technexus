import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/shared/Button";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { getOutboxOverview, resetFailedOutbox, retryFailedOutbox, retryOutboxRow } from "@/features/api/admin-api";
import { getWorkerHealth } from "@/features/api/dashboard-api";
import { useAuth } from "@/features/auth/auth-context";
import { formatDate } from "@/lib/format";

export function AdminOperationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const outboxQuery = useQuery({
    queryKey: ["admin", "operations", "outbox"],
    enabled: Boolean(token),
    queryFn: () => getOutboxOverview(token!)
  });
  const workerQuery = useQuery({
    queryKey: ["admin", "operations", "worker"],
    enabled: Boolean(token),
    queryFn: () => getWorkerHealth(token!)
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "operations", "outbox"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "operations", "worker"] })
    ]);

  const retryAllMutation = useMutation({
    mutationFn: async () => retryFailedOutbox(token!),
    onSuccess: refresh
  });
  const retryRowMutation = useMutation({
    mutationFn: async (rowId: string) => retryOutboxRow(token!, rowId),
    onSuccess: refresh
  });
  const resetRowMutation = useMutation({
    mutationFn: async (rowId: string) => resetFailedOutbox(token!, rowId),
    onSuccess: refresh
  });

  return (
    <div className="stack-lg">
      <SurfaceCard title={t("dashboard.operations.workerHealthTitle")} description={t("dashboard.operations.workerHealthDescription")}>
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">{t("dashboard.operations.statusLabel")}</span>
            <strong className="metric-value">{workerQuery.data?.worker.status ?? "..."}</strong>
            <p className="metric-description">{t("dashboard.operations.statusDescription")}</p>
          </div>
          <div className="metric-card">
            <span className="metric-label">{t("dashboard.operations.lastRunLabel")}</span>
            <strong className="metric-value">
              {workerQuery.data?.worker.lastRunAt ? formatDate(workerQuery.data.worker.lastRunAt) : t("dashboard.operations.noData")}
            </strong>
            <p className="metric-description">{t("dashboard.operations.lastRunDescription")}</p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title={t("dashboard.operations.emailOutboxTitle")}
        description={t("dashboard.operations.emailOutboxDescription")}
        action={
          <Button variant="secondary" onClick={() => retryAllMutation.mutate()}>
            {t("buttons.retryFailed")}
          </Button>
        }
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("labels.recipient")}</th>
                <th>{t("labels.status")}</th>
                <th>{t("labels.attempts")}</th>
                <th>{t("labels.createdAt")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(outboxQuery.data?.rows ?? []).map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.recipientEmail}</strong>
                    <p>{row.subject}</p>
                  </td>
                  <td>{row.status}</td>
                  <td>{row.attempts}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>
                    <div className="button-row">
                      <Button variant="secondary" onClick={() => retryRowMutation.mutate(row.id)}>
                        {t("buttons.retry")}
                      </Button>
                      <Button variant="ghost" onClick={() => resetRowMutation.mutate(row.id)}>
                        {t("buttons.reset")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
