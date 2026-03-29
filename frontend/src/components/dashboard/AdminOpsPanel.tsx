import { useMemo, useState } from "react";
import { dateFormatter } from "../../lib/api";
import { useAdminOpsData, useResetFailedRow, useRetryEmailRow } from "../../hooks/useAdminOps";
import type { EmailOutboxFilters, EmailOutboxRow } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { DataTable, type DataTableColumn } from "./DataTable";

type AdminOpsPanelProps = {
  token: string;
};

const defaultFilters: EmailOutboxFilters = {
  status: null,
  from: null,
  to: null,
  retryCount: null
};

const refreshOptions = [
  { label: "Off", value: 0 },
  { label: "15s", value: 15_000 },
  { label: "30s", value: 30_000 },
  { label: "60s", value: 60_000 }
] as const;

/**
 * Advanced admin operations panel with filters, auto-refresh and bulk actions.
 */
export function AdminOpsPanel({ token }: AdminOpsPanelProps) {
  const [filters, setFilters] = useState<EmailOutboxFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<EmailOutboxFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [refreshIntervalMs, setRefreshIntervalMs] =
    useState<(typeof refreshOptions)[number]["value"]>(30_000);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"retry" | "reset" | null>(null);

  const { overviewQuery, workerQuery, metricsQuery } = useAdminOpsData(
    token,
    page,
    appliedFilters,
    refreshIntervalMs
  );
  const retryRow = useRetryEmailRow(token);
  const resetRow = useResetFailedRow(token);

  const overview = overviewQuery.data;
  const worker = workerQuery.data?.worker;
  const metrics = metricsQuery.data;
  const rows = overview?.rows ?? [];

  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.includes(row.id)), [rows, selectedIds]);

  const columns = useMemo<Array<DataTableColumn<EmailOutboxRow>>>(
    () => [
      {
        id: "select",
        header: "Select",
        cell: (row) => (
          <input
            aria-label={`Select email row for ${row.recipientEmail}`}
            checked={selectedIds.includes(row.id)}
            className="h-4 w-4 accent-pine"
            onChange={(event) =>
              setSelectedIds((current) =>
                event.target.checked ? [...current, row.id] : current.filter((item) => item !== row.id)
              )
            }
            type="checkbox"
          />
        )
      },
      {
        id: "recipient",
        header: "Recipient",
        accessor: (row) => row.recipientEmail,
        searchValue: (row) => `${row.recipientEmail} ${row.subject} ${row.orderId}`,
        sortable: true,
        cell: (row) => (
          <div>
            <p className="font-semibold text-ink">{row.recipientEmail}</p>
            <p className="mt-1 text-sm text-slate">
              {row.recipientType} · order {row.orderId.slice(0, 8)}
            </p>
          </div>
        )
      },
      {
        id: "status",
        header: "Status",
        accessor: (row) => row.status,
        sortable: true,
        cell: (row) => (
          <Badge variant={row.status === "sent" ? "success" : row.status === "failed" ? "error" : "warning"}>
            {row.status}
          </Badge>
        )
      },
      {
        id: "attempts",
        header: "Attempts",
        accessor: (row) => row.attempts,
        sortable: true
      },
      {
        id: "createdAt",
        header: "Created",
        accessor: (row) => row.createdAt,
        sortable: true,
        cell: (row) => dateFormatter.format(new Date(row.createdAt))
      },
      {
        id: "actions",
        header: "Actions",
        cell: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              aria-label={`Retry email to ${row.recipientEmail}`}
              loading={retryRow.isPending && retryRow.variables === row.id}
              onClick={() => void retryRow.mutateAsync(row.id)}
              variant="warning"
            >
              Retry
            </Button>
            <Button
              aria-label={`Reset failed state for email to ${row.recipientEmail}`}
              loading={resetRow.isPending && resetRow.variables === row.id}
              onClick={() => void resetRow.mutateAsync(row.id)}
              variant="secondary"
            >
              Reset
            </Button>
          </div>
        )
      }
    ],
    [resetRow, retryRow, selectedIds]
  );

  if (overviewQuery.isLoading || workerQuery.isLoading || metricsQuery.isLoading || !overview || !worker || !metrics) {
    return <Card description="Loading operations visibility." title="Admin Ops" />;
  }

  const executeBulkAction = async () => {
    if (bulkAction === "retry") {
      await Promise.all(selectedRows.map((row) => retryRow.mutateAsync(row.id)));
    }

    if (bulkAction === "reset") {
      await Promise.all(selectedRows.map((row) => resetRow.mutateAsync(row.id)));
    }

    setSelectedIds([]);
    setBulkAction(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card eyebrow="Pending emails" role="region" title={metrics.email_outbox_pending} />
        <Card eyebrow="Failed emails" role="region" title={metrics.email_outbox_failed} />
        <Card eyebrow="Sent emails" role="region" title={metrics.email_outbox_sent} />
        <Card eyebrow="Retries total" role="region" title={metrics.email_retry_total} />
        <Card eyebrow="Active alerts" role="region" title={overview.alerts.length} />
      </div>

      <Card
        description="Worker heartbeat and throughput based on admin ops endpoints."
        role="region"
        title="Worker Health"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="surface-muted px-4 py-4">
            <p className="text-label">Status</p>
            <div className="mt-2">
              <Badge variant={worker.status === "healthy" ? "success" : worker.status === "down" ? "error" : "warning"}>
                {worker.status}
              </Badge>
            </div>
          </div>
          <div className="surface-muted px-4 py-4">
            <p className="text-label">Last processed</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {worker.lastProcessedAt ? dateFormatter.format(new Date(worker.lastProcessedAt)) : "n/a"}
            </p>
          </div>
          <div className="surface-muted px-4 py-4">
            <p className="text-label">Uptime</p>
            <p className="mt-2 text-sm font-semibold text-ink">{worker.uptimeSeconds}s</p>
          </div>
        </div>
      </Card>

      <Card role="region" title="Queue filters">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Select
            label="Status"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value ? (event.target.value as EmailOutboxRow["status"]) : null
              }))
            }
            options={[
              { label: "All", value: "" },
              { label: "pending", value: "pending" },
              { label: "failed", value: "failed" },
              { label: "sent", value: "sent" }
            ]}
            value={filters.status ?? ""}
          />
          <Input
            label="Retry count"
            min="0"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                retryCount: event.target.value ? Number(event.target.value) : null
              }))
            }
            type="number"
            value={filters.retryCount ?? ""}
          />
          <Input
            label="From"
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value || null }))}
            type="date"
            value={filters.from ?? ""}
          />
          <Input
            label="To"
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value || null }))}
            type="date"
            value={filters.to ?? ""}
          />
          <div className="flex items-end">
            <Button
              fullWidth
              onClick={() => {
                setPage(1);
                setAppliedFilters(filters);
              }}
            >
              Apply filters
            </Button>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate">
          Backend page {overview.pagination.page} of {overview.pagination.totalPages} · total {overview.pagination.total}
        </p>
      </Card>

      <DataTable
        caption="Admin email queue"
        columns={columns}
        description="Queue inspection surface with client-side search, backend pagination inputs and bulk operations."
        emptyMessage="No queue rows matched the current filters."
        rowKey={(row) => row.id}
        rows={rows}
        searchLabel="Search email queue rows"
        title="Email Queue"
        toolbar={
          <>
            <Select
              aria-label="Auto refresh interval"
              onChange={(event) => setRefreshIntervalMs(Number(event.target.value) as (typeof refreshOptions)[number]["value"])}
              options={refreshOptions.map((option) => ({ label: option.label, value: String(option.value) }))}
              value={String(refreshIntervalMs)}
            />
            <Button
              aria-label="Retry all selected email rows"
              disabled={selectedRows.length === 0}
              onClick={() => setBulkAction("retry")}
              variant="warning"
            >
              Retry selected
            </Button>
            <Button
              aria-label="Reset all selected email rows"
              disabled={selectedRows.length === 0}
              onClick={() => setBulkAction("reset")}
              variant="secondary"
            >
              Reset selected
            </Button>
          </>
        }
      />

      <Modal
        confirmLabel={bulkAction === "retry" ? "Retry selected" : "Reset selected"}
        confirmVariant={bulkAction === "retry" ? "warning" : "secondary"}
        description={`This action will affect ${selectedRows.length} selected rows.`}
        isOpen={bulkAction !== null}
        onClose={() => setBulkAction(null)}
        onConfirm={() => void executeBulkAction()}
        title={bulkAction === "retry" ? "Confirm retry" : "Confirm reset"}
      />
    </div>
  );
}
