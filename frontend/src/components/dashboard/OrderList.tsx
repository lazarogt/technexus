import { useMemo } from "react";
import { currencyFormatter, dateFormatter } from "../../lib/api";
import type { Order, OrderStatus } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { Select } from "../ui/Select";
import { DataTable, type DataTableColumn } from "./DataTable";

const statusVariantMap: Record<OrderStatus, "info" | "warning" | "success"> = {
  pending: "warning",
  paid: "info",
  shipped: "info",
  delivered: "success"
};

/**
 * Seller order listing with status actions and customer details.
 */
export type OrderListProps = {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  pendingOrderId?: string | null;
};

export function OrderList({ orders, onUpdateStatus, pendingOrderId = null }: OrderListProps) {
  const columns = useMemo<Array<DataTableColumn<Order>>>(
    () => [
      {
        id: "order",
        header: "Order",
        accessor: (order) => order.id,
        searchValue: (order) => `${order.id} ${order.userName} ${order.userEmail}`,
        cell: (order) => (
          <div>
            <p className="font-semibold text-ink">#{order.id.slice(0, 8)}</p>
            <p className="mt-1 text-sm text-slate">{order.items.length} items</p>
          </div>
        )
      },
      {
        id: "customer",
        header: "Customer",
        accessor: (order) => order.userName,
        sortable: true,
        cell: (order) => (
          <div>
            <p className="font-semibold text-ink">{order.userName}</p>
            <p className="mt-1 text-sm text-slate">{order.userEmail}</p>
          </div>
        )
      },
      {
        id: "date",
        header: "Date",
        accessor: (order) => order.createdAt,
        sortable: true,
        cell: (order) => dateFormatter.format(new Date(order.createdAt))
      },
      {
        id: "total",
        header: "Total",
        accessor: (order) => order.total,
        sortable: true,
        cell: (order) => currencyFormatter.format(order.total)
      },
      {
        id: "status",
        header: "Status",
        accessor: (order) => order.status,
        sortable: true,
        cell: (order) => (
          <div className="flex flex-col gap-3">
            <Badge variant={statusVariantMap[order.status]}>{order.status}</Badge>
            <Select
              aria-label={`Update status for order ${order.id.slice(0, 8)}`}
              disabled={pendingOrderId === order.id}
              onChange={(event) => onUpdateStatus(order.id, event.target.value as OrderStatus)}
              options={[
                { label: "pending", value: "pending" },
                { label: "paid", value: "paid" },
                { label: "shipped", value: "shipped" },
                { label: "delivered", value: "delivered" }
              ]}
              value={order.status}
            />
          </div>
        )
      }
    ],
    [onUpdateStatus, pendingOrderId]
  );

  return (
    <DataTable
      caption="Seller orders"
      columns={columns}
      description="Orders remain scoped to the authenticated seller."
      emptyMessage="No orders matched the current selection."
      rowKey={(order) => order.id}
      rows={orders}
      searchLabel="Search seller orders"
      searchPlaceholder="Search orders by id, customer or email"
      title="Orders"
    />
  );
}
