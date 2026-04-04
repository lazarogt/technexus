import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricCard } from "@/components/shared/MetricCard";
import { SelectField } from "@/components/shared/SelectField";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { listOrders, listSellerOrders, updateOrderStatus } from "@/features/api/order-api";
import type { OrderRecord, OrderStatus } from "@/features/api/types";
import { useAuth } from "@/features/auth/auth-context";
import { getOrderStatusLabel } from "@/i18n/es";
import { formatCurrency, formatDate } from "@/lib/format";

type OrdersPageViewProps = {
  mode: "account" | "seller" | "admin";
};

export function OrdersPageView({ mode }: OrdersPageViewProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [status, setStatus] = useState("");
  const orderStatusOptions: Array<{ value: string; label: string }> = [
    { value: "", label: t("dashboard.orders.all") },
    { value: "pending", label: getOrderStatusLabel("pending") },
    { value: "paid", label: getOrderStatusLabel("paid") },
    { value: "shipped", label: getOrderStatusLabel("shipped") },
    { value: "delivered", label: getOrderStatusLabel("delivered") }
  ];

  const ordersQuery = useQuery({
    queryKey: ["dashboard", "orders", mode, status],
    enabled: Boolean(token),
    queryFn: () =>
      mode === "seller"
        ? listSellerOrders(token!, { status: status as OrderStatus | undefined })
        : listOrders(token!, { status: status as OrderStatus | undefined })
  });

  const statusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }: { orderId: string; nextStatus: OrderStatus }) => {
      if (!token) {
        throw new Error(t("dashboard.orders.authRequired"));
      }

      return updateOrderStatus(token, orderId, nextStatus);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "orders"] });
    }
  });

  const orders = ordersQuery.data?.orders ?? [];
  const revenue = orders.reduce((sum, order) => {
    if (mode === "seller") {
      const sellerSubtotal = order.items.reduce((itemSum, item) => itemSum + item.subtotal, 0);
      return sum + sellerSubtotal;
    }

    return sum + order.total;
  }, 0);

  return (
    <div className="stack-lg">
      <div className="metrics-grid">
        <MetricCard label={t("dashboard.orders.ordersLabel")} value={String(orders.length)} description={t("dashboard.orders.ordersDescription")} />
        <MetricCard label={t("dashboard.orders.pendingLabel")} value={String(orders.filter((order) => order.status === "pending").length)} description={t("dashboard.orders.pendingDescription")} />
        <MetricCard label={t("dashboard.orders.amountLabel")} value={formatCurrency(revenue)} description={t("dashboard.orders.amountDescription")} />
      </div>

      <SurfaceCard
        title={t("dashboard.orders.managementTitle")}
        description={t("dashboard.orders.managementDescription")}
        action={
          <SelectField
            label={t("labels.status")}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={orderStatusOptions}
          />
        }
      >
        {orders.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("nav.orders")}</th>
                  <th>{t("labels.customer")}</th>
                  <th>{t("labels.total")}</th>
                  <th>{t("labels.status")}</th>
                  <th>{t("labels.items")}</th>
                  {mode !== "account" ? <th>{t("labels.action")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    mode={mode}
                    onStatusChange={(nextStatus) =>
                      statusMutation.mutate({ orderId: order.id, nextStatus })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={t("dashboard.orders.emptyTitle")} description={t("dashboard.orders.emptyDescription")} />
        )}
      </SurfaceCard>
    </div>
  );
}

function OrderRow({
  order,
  mode,
  onStatusChange
}: {
  order: OrderRecord;
  mode: "account" | "seller" | "admin";
  onStatusChange: (status: OrderStatus) => void;
}) {
  return (
    <tr>
      <td>
        <strong>#{order.id.slice(0, 8)}</strong>
        <p>{formatDate(order.createdAt)}</p>
      </td>
      <td>
        <strong>{order.userName}</strong>
        <p>{order.userEmail}</p>
      </td>
      <td>{formatCurrency(order.total)}</td>
      <td>
        <span className={`status-pill status-${order.status}`}>{getOrderStatusLabel(order.status)}</span>
      </td>
      <td>
        <ul className="compact-list">
          {order.items.map((item) => (
            <li key={item.id}>
              {item.quantity} x {item.productName}
            </li>
          ))}
        </ul>
      </td>
      {mode !== "account" ? (
        <td>
          <select value={order.status} onChange={(event) => onStatusChange(event.target.value as OrderStatus)}>
            <option value="pending">{getOrderStatusLabel("pending")}</option>
            <option value="paid">{getOrderStatusLabel("paid")}</option>
            <option value="shipped">{getOrderStatusLabel("shipped")}</option>
            <option value="delivered">{getOrderStatusLabel("delivered")}</option>
          </select>
        </td>
      ) : null}
    </tr>
  );
}
