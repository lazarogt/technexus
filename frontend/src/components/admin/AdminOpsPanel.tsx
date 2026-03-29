import { useEffect, useState } from "react";
import { apiRequest, dateFormatter } from "../../lib/api";
import type {
  EmailOutboxFilters,
  EmailOutboxOverview,
  EmailOutboxRow,
  EmailOutboxWorkerHealth
} from "../../lib/types";

type AdminOpsPanelProps = {
  token: string;
};

const emptyOverview: EmailOutboxOverview = {
  metrics: {
    total: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    retrying: 0,
    oldestPendingAgeSeconds: null,
    failedAttemptsCount: 0,
    failedLastFiveMinutes: 0
  },
  rows: [],
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  },
  filters: {
    status: null,
    from: null,
    to: null,
    retryCount: null
  },
  alerts: []
};

const emptyWorker: EmailOutboxWorkerHealth = {
  isStarted: false,
  isProcessing: false,
  lastRunAt: null,
  lastSuccessAt: null,
  lastProcessedAt: null,
  lastError: null,
  lastProcessedCount: 0,
  processedJobsCount: 0,
  failedJobsCount: 0,
  lastRunDurationMs: null,
  startedAt: null,
  uptimeSeconds: 0,
  secondsSinceLastRun: 0,
  status: "down"
};

const defaultFilters: EmailOutboxFilters = {
  status: null,
  from: null,
  to: null,
  retryCount: null
};

export function AdminOpsPanel({ token }: AdminOpsPanelProps) {
  const [overview, setOverview] = useState<EmailOutboxOverview>(emptyOverview);
  const [worker, setWorker] = useState<EmailOutboxWorkerHealth>(emptyWorker);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Visibilidad operativa del email outbox y del worker.");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [filters, setFilters] = useState<EmailOutboxFilters>(defaultFilters);
  const [page, setPage] = useState(1);

  const fetchOpsData = async (nextPage = page, nextFilters = filters) => {
    setLoading(true);
    setError("");

    const query = new URLSearchParams({
      page: String(nextPage),
      limit: String(25)
    });

    if (nextFilters.status) {
      query.set("status", nextFilters.status);
    }

    if (nextFilters.from) {
      query.set("from", nextFilters.from);
    }

    if (nextFilters.to) {
      query.set("to", nextFilters.to);
    }

    if (nextFilters.retryCount !== null) {
      query.set("retryCount", String(nextFilters.retryCount));
    }

    try {
      const [nextOverview, nextWorker] = await Promise.all([
        apiRequest<EmailOutboxOverview>(`/admin/ops/email-outbox?${query.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }),
        apiRequest<{ worker: EmailOutboxWorkerHealth }>("/admin/ops/worker-health", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      ]);

      setOverview(nextOverview);
      setWorker(nextWorker.worker);
      setPage(nextOverview.pagination.page);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo cargar el estado operativo."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOpsData(1, filters);
  }, [token]);

  const runAction = async (
    actionKey: string,
    request: () => Promise<{ message?: string; result?: string; updated?: number }>
  ) => {
    setBusyAction(actionKey);
    setError("");

    try {
      const response = await request();
      setMessage(
        response.message ??
          (typeof response.updated === "number"
            ? `Filas reprogramadas: ${response.updated}.`
            : `Operacion completada${response.result ? `: ${response.result}.` : "."}`)
      );
      await fetchOpsData();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "No se pudo ejecutar la accion."
      );
    } finally {
      setBusyAction((current) => (current === actionKey ? null : current));
    }
  };

  const failedRows = overview.rows.filter((row) => row.status === "failed");

  return (
    <div className="admin-panel__body">
      <div className="admin-ops-summary">
        <article className="admin-ops-metric">
          <span>Pending</span>
          <strong>{overview.metrics.pending}</strong>
        </article>
        <article className="admin-ops-metric">
          <span>Sent</span>
          <strong>{overview.metrics.sent}</strong>
        </article>
        <article className="admin-ops-metric">
          <span>Failed</span>
          <strong>{overview.metrics.failed}</strong>
        </article>
        <article className="admin-ops-metric">
          <span>Failed 5m</span>
          <strong>{overview.metrics.failedLastFiveMinutes}</strong>
        </article>
        <article className="admin-ops-metric">
          <span>Retrying</span>
          <strong>{overview.metrics.retrying}</strong>
        </article>
        <article className="admin-ops-metric">
          <span>Alertas activas</span>
          <strong>{overview.alerts.length}</strong>
        </article>
      </div>

      <div className="admin-toolbar admin-toolbar--ops">
        <button
          disabled={busyAction === "refresh" || loading}
          onClick={() =>
            void runAction("refresh", async () => {
              await fetchOpsData();
              return { message: "Panel operativo actualizado." };
            })
          }
          type="button"
        >
          {busyAction === "refresh" || loading ? "Actualizando..." : "Actualizar"}
        </button>
        <button
          disabled={busyAction === "retry-failed"}
          onClick={() =>
            void runAction("retry-failed", () =>
              apiRequest<{ updated: number }>("/admin/ops/email-outbox/retry-failed", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`
                }
              })
            )
          }
          type="button"
        >
          {busyAction === "retry-failed" ? "Reintentando..." : "Reintentar fallidos"}
        </button>
      </div>

      <div className="admin-card__meta">
        <label>
          Estado
          <select
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value ? (event.target.value as EmailOutboxRow["status"]) : null
              }))
            }
            value={filters.status ?? ""}
          >
            <option value="">Todos</option>
            <option value="pending">pending</option>
            <option value="failed">failed</option>
            <option value="sent">sent</option>
          </select>
        </label>
        <label>
          Desde
          <input
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                from: event.target.value || null
              }))
            }
            type="date"
            value={filters.from ?? ""}
          />
        </label>
        <label>
          Hasta
          <input
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                to: event.target.value || null
              }))
            }
            type="date"
            value={filters.to ?? ""}
          />
        </label>
        <label>
          Retry count
          <input
            min="0"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                retryCount: event.target.value === "" ? null : Number(event.target.value)
              }))
            }
            type="number"
            value={filters.retryCount ?? ""}
          />
        </label>
        <button
          disabled={loading}
          onClick={() => {
            setPage(1);
            void fetchOpsData(1, filters);
          }}
          type="button"
        >
          Aplicar filtros
        </button>
      </div>

      <p className="panel-note panel-note--admin">{message}</p>
      {error ? <p className="panel-error">{error}</p> : null}

      {overview.alerts.length === 0 ? null : (
        <section className="admin-ops-health">
          <div>
            <span className="status-chip status-chip--pending">Alertas</span>
            <h3>Estado de alertas</h3>
          </div>
          <div className="admin-ops-table__rows">
            {overview.alerts.map((alert) => (
              <article className="admin-ops-row" key={alert.code}>
                <div className="admin-ops-row__main">
                  <strong>{alert.code}</strong>
                  <span className="status-chip status-chip--pending">{alert.severity}</span>
                </div>
                <div className="admin-card__meta">
                  <span>{alert.context.reason as string}</span>
                  <span>{dateFormatter.format(new Date(alert.triggeredAt))}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="admin-ops-health">
        <div>
          <span
            className={`status-chip status-chip--${
              worker.status === "healthy" ? "paid" : "pending"
            }`}
          >
            Worker {worker.status}
          </span>
          <h3>Estado del worker</h3>
        </div>
        <div className="admin-card__meta">
          <span>
            Ultima corrida:{" "}
            {worker.lastRunAt ? dateFormatter.format(new Date(worker.lastRunAt)) : "sin datos"}
          </span>
          <span>
            Ultimo exito:{" "}
            {worker.lastSuccessAt
              ? dateFormatter.format(new Date(worker.lastSuccessAt))
              : "sin datos"}
          </span>
          <span>
            Ultimo procesado:{" "}
            {worker.lastProcessedAt
              ? dateFormatter.format(new Date(worker.lastProcessedAt))
              : "sin datos"}
          </span>
          <span>Procesadas total: {worker.processedJobsCount}</span>
          <span>Fallidas total: {worker.failedJobsCount}</span>
          <span>Uptime: {worker.uptimeSeconds}s</span>
        </div>
        {worker.lastError ? <p className="panel-error">{worker.lastError}</p> : null}
      </section>

      <div className="admin-ops-table">
        <div className="admin-ops-table__header">
          <h3>Filas del outbox</h3>
          <span>
            {overview.pagination.total} total · pagina {overview.pagination.page}/
            {overview.pagination.totalPages}
          </span>
        </div>

        {overview.rows.length > 0 ? (
          <div className="admin-ops-table__rows">
            {overview.rows.map((row: EmailOutboxRow) => (
              <article className="admin-ops-row" key={row.id}>
                <div className="admin-ops-row__main">
                  <div>
                    <strong>{row.recipientEmail}</strong>
                    <p>
                      {row.recipientType} · pedido {row.orderId.slice(0, 8)}
                      {row.sellerId ? ` · seller ${row.sellerId.slice(0, 8)}` : ""}
                    </p>
                  </div>
                  <span
                    className={`status-chip status-chip--${
                      row.status === "failed" ? "pending" : "paid"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="admin-card__meta">
                  <span>Attempts: {row.attempts}</span>
                  <span>
                    Next attempt:{" "}
                    {row.nextAttemptAt
                      ? dateFormatter.format(new Date(row.nextAttemptAt))
                      : "sin fecha"}
                  </span>
                  <span>Creado: {dateFormatter.format(new Date(row.createdAt))}</span>
                  <span>{row.subject}</span>
                </div>
                {row.lastError ? <p className="panel-error">{row.lastError}</p> : null}
                <div className="admin-card__actions">
                  <button
                    disabled={busyAction === `retry-${row.id}` || row.status === "sent"}
                    onClick={() =>
                      void runAction(`retry-${row.id}`, () =>
                        apiRequest<{ result: string; message?: string }>(
                          `/admin/ops/email-outbox/${row.id}/retry`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`
                            }
                          }
                        )
                      )
                    }
                    type="button"
                  >
                    {busyAction === `retry-${row.id}` ? "Procesando..." : "Retry now"}
                  </button>
                  <button
                    className="ghost-button"
                    disabled={busyAction === `reset-${row.id}` || row.status !== "failed"}
                    onClick={() =>
                      void runAction(`reset-${row.id}`, () =>
                        apiRequest<{ result: string; message?: string }>(
                          `/admin/ops/email-outbox/${row.id}/reset-failed`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`
                            }
                          }
                        )
                      )
                    }
                    type="button"
                  >
                    {busyAction === `reset-${row.id}` ? "Rearmando..." : "Reset failed"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Sin filas para los filtros actuales.</h3>
            <p>El outbox no muestra resultados con la combinacion seleccionada.</p>
          </div>
        )}
      </div>

      <div className="admin-card__actions">
        <button
          disabled={!overview.pagination.hasPreviousPage || loading}
          onClick={() => void fetchOpsData(page - 1, filters)}
          type="button"
        >
          Anterior
        </button>
        <button
          disabled={!overview.pagination.hasNextPage || loading}
          onClick={() => void fetchOpsData(page + 1, filters)}
          type="button"
        >
          Siguiente
        </button>
      </div>

      {failedRows.length === 0 ? null : (
        <p className="panel-note">
          Fallidos visibles: {failedRows.length}. Puedes reintentar individualmente o usar el
          reproceso masivo.
        </p>
      )}
    </div>
  );
}
