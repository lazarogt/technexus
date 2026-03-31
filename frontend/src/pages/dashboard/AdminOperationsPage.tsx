import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/shared/Button";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { getOutboxOverview, resetFailedOutbox, retryFailedOutbox, retryOutboxRow } from "@/features/api/admin-api";
import { getWorkerHealth } from "@/features/api/dashboard-api";
import { useAuth } from "@/features/auth/auth-context";
import { formatDate } from "@/lib/format";

export function AdminOperationsPage() {
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
      <SurfaceCard title="Worker health" description="Estado actual del outbox de correos.">
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Status</span>
            <strong className="metric-value">{workerQuery.data?.worker.status ?? "..."}</strong>
            <p className="metric-description">Última ejecución y degradación reportada.</p>
          </div>
          <div className="metric-card">
            <span className="metric-label">Última corrida</span>
            <strong className="metric-value">
              {workerQuery.data?.worker.lastRunAt ? formatDate(workerQuery.data.worker.lastRunAt) : "Sin dato"}
            </strong>
            <p className="metric-description">Tiempo de la última pasada del worker.</p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Email outbox"
        description="Reintento y saneamiento de filas fallidas."
        action={
          <Button variant="secondary" onClick={() => retryAllMutation.mutate()}>
            Reintentar fallidas
          </Button>
        }
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Destinatario</th>
                <th>Estado</th>
                <th>Intentos</th>
                <th>Creado</th>
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
                        Reintentar
                      </Button>
                      <Button variant="ghost" onClick={() => resetRowMutation.mutate(row.id)}>
                        Reset
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
