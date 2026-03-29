import { useMemo, useState, type ReactNode } from "react";
import { cn } from "../../lib/ui";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export type DataTableColumn<T> = {
  /** Stable identifier used for sort state and rendering keys. */
  id: string;
  /** Header label rendered in the table head and mobile cards. */
  header: string;
  /** Value used for sorting when the column is sortable. */
  accessor?: (row: T) => string | number | null | undefined;
  /** Optional custom cell renderer. */
  cell?: (row: T) => ReactNode;
  /** Value used by client-side search. */
  searchValue?: (row: T) => string;
  /** Enables sort interactions for the column. */
  sortable?: boolean;
  /** Optional classes for desktop cells. */
  className?: string;
};

export type DataTableProps<T> = {
  /** Dataset rendered by the table. */
  rows: T[];
  /** Table column definitions. */
  columns: DataTableColumn<T>[];
  /** Stable row key factory. */
  rowKey: (row: T) => string;
  /** Caption used for screen readers. */
  caption?: string;
  /** Empty state label shown when no rows match current filters. */
  emptyMessage: string;
  /** Optional title slot rendered above the table. */
  title?: ReactNode;
  /** Optional descriptive copy rendered above the table. */
  description?: ReactNode;
  /** Extra controls rendered beside the search bar. */
  toolbar?: ReactNode;
  /** Search placeholder for internal filtering. */
  searchPlaceholder?: string;
  /** Enables internal text search across searchable columns. */
  searchable?: boolean;
  /** Initial page size for client-side pagination. */
  defaultPageSize?: number;
  /** Accessible label for the internal search field. */
  searchLabel?: string;
};

type SortState = {
  columnId: string;
  direction: "asc" | "desc";
};

/**
 * Generic, accessible and responsive data table for dashboard surfaces.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  emptyMessage,
  title,
  description,
  toolbar,
  searchPlaceholder = "Search rows",
  searchable = true,
  defaultPageSize = 8,
  searchLabel = "Search table rows"
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sort, setSort] = useState<SortState | null>(null);

  const filteredRows = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) =>
      columns.some((column) => {
        const rawValue = column.searchValue
          ? column.searchValue(row)
          : column.accessor
            ? String(column.accessor(row) ?? "")
            : "";

        return rawValue.toLowerCase().includes(normalizedQuery);
      })
    );
  }, [columns, rows, search]);

  const sortedRows = useMemo(() => {
    if (!sort) {
      return filteredRows;
    }

    const column = columns.find((item) => item.id === sort.columnId);

    if (!column?.accessor) {
      return filteredRows;
    }

    return [...filteredRows].sort((left, right) => {
      const leftValue = column.accessor?.(left) ?? "";
      const rightValue = column.accessor?.(right) ?? "";

      if (leftValue === rightValue) {
        return 0;
      }

      const result = leftValue > rightValue ? 1 : -1;
      return sort.direction === "asc" ? result : result * -1;
    });
  }, [columns, filteredRows, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) {
      return;
    }

    setPage(1);
    setSort((current) => {
      if (!current || current.columnId !== column.id) {
        return { columnId: column.id, direction: "asc" };
      }

      return {
        columnId: column.id,
        direction: current.direction === "asc" ? "desc" : "asc"
      };
    });
  };

  return (
    <Card description={description} role="region" title={title}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {searchable ? (
          <div className="w-full max-w-md">
            <Input
              aria-label={searchLabel}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder={searchPlaceholder}
              value={search}
            />
          </div>
        ) : (
          <div />
        )}
        {toolbar ? <div className="flex flex-wrap gap-3">{toolbar}</div> : null}
      </div>

      {visibleRows.length === 0 ? (
        <div
          aria-live="polite"
          className="surface-muted mt-5 px-4 py-8 text-center text-sm text-slate"
          role="status"
        >
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="mt-5 hidden overflow-x-auto lg:block">
            <table className="min-w-full border-separate border-spacing-y-3 text-left">
              {caption ? <caption className="sr-only">{caption}</caption> : null}
              <thead>
                <tr>
                  {columns.map((column) => {
                    const isSorted = sort?.columnId === column.id;

                    return (
                      <th
                        aria-sort={
                          isSorted ? (sort?.direction === "asc" ? "ascending" : "descending") : "none"
                        }
                        className="px-3 text-xs uppercase tracking-[0.16em] text-slate"
                        key={column.id}
                        scope="col"
                      >
                        {column.sortable ? (
                          <button
                            aria-label={`Sort by ${column.header}`}
                            className="inline-flex items-center gap-2 font-bold"
                            onClick={() => handleSort(column)}
                            type="button"
                          >
                            <span>{column.header}</span>
                            <span>{isSorted ? (sort?.direction === "asc" ? "↑" : "↓") : "↕"}</span>
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr className="panel-surface" key={rowKey(row)}>
                    {columns.map((column) => (
                      <td className={cn("px-3 py-4 align-top text-sm text-slate", column.className)} key={column.id}>
                        {column.cell ? column.cell(row) : String(column.accessor?.(row) ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div aria-label={caption ?? "Table rows"} className="mt-5 grid gap-3 lg:hidden" role="list">
            {visibleRows.map((row) => (
              <article className="panel-surface p-4" key={rowKey(row)} role="listitem">
                <dl className="grid gap-3">
                  {columns.map((column) => (
                    <div className="grid gap-1" key={column.id}>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-slate">
                        {column.header}
                      </dt>
                      <dd className="text-sm text-ink">
                        {column.cell ? column.cell(row) : String(column.accessor?.(row) ?? "")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="text-sm text-slate">
          Page {currentPage} of {totalPages} · {sortedRows.length} rows
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            aria-label="Rows per page"
            className="min-w-[110px]"
            onChange={(event) => {
              setPage(1);
              setPageSize(Number(event.target.value));
            }}
            options={[
              { label: "8 / page", value: "8" },
              { label: "12 / page", value: "12" },
              { label: "20 / page", value: "20" }
            ]}
            value={String(pageSize)}
          />
          <Button
            aria-label="Go to previous table page"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            variant="secondary"
          >
            Previous
          </Button>
          <Button
            aria-label="Go to next table page"
            disabled={currentPage === totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            variant="secondary"
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
