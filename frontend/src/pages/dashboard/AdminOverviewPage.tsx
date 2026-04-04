import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MetricCard } from "@/components/shared/MetricCard";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { listUsers } from "@/features/api/admin-api";
import { listProducts } from "@/features/api/catalog-api";
import { getMetrics } from "@/features/api/dashboard-api";
import { listInventoryAlerts } from "@/features/api/inventory-api";
import { listOrders } from "@/features/api/order-api";
import { useAuth } from "@/features/auth/auth-context";

export function AdminOverviewPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const metricsQuery = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: getMetrics
  });
  const productsQuery = useQuery({
    queryKey: ["admin", "products", "overview"],
    queryFn: () => listProducts({ limit: 50 })
  });
  const usersQuery = useQuery({
    queryKey: ["admin", "users", "overview"],
    enabled: Boolean(token),
    queryFn: () => listUsers(token!, { limit: 50 })
  });
  const ordersQuery = useQuery({
    queryKey: ["admin", "orders", "overview"],
    enabled: Boolean(token),
    queryFn: () => listOrders(token!)
  });
  const alertsQuery = useQuery({
    queryKey: ["admin", "alerts", "overview"],
    enabled: Boolean(token),
    queryFn: () => listInventoryAlerts(token!)
  });

  return (
    <div className="stack-lg">
      <div className="metrics-grid">
        <MetricCard label={t("dashboard.adminOverview.productsLabel")} value={String(productsQuery.data?.products.length ?? 0)} description={t("dashboard.adminOverview.productsDescription")} />
        <MetricCard label={t("dashboard.adminOverview.usersLabel")} value={String(usersQuery.data?.users.length ?? 0)} description={t("dashboard.adminOverview.usersDescription")} />
        <MetricCard label={t("dashboard.adminOverview.ordersLabel")} value={String(ordersQuery.data?.orders.length ?? 0)} description={t("dashboard.adminOverview.ordersDescription")} />
        <MetricCard label={t("dashboard.adminOverview.outboxLabel")} value={String(metricsQuery.data?.email_outbox_pending ?? 0)} description={t("dashboard.adminOverview.outboxDescription")} />
      </div>
      <SurfaceCard title={t("dashboard.adminOverview.risksTitle")} description={t("dashboard.adminOverview.risksDescription")}>
        <ul className="compact-list">
          {(alertsQuery.data?.alerts ?? []).map((alert) => (
            <li key={alert.id}>
              {t("dashboard.adminOverview.alertRow", {
                productName: alert.productName,
                locationName: alert.locationName,
                quantity: alert.triggeredQty
              })}
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </div>
  );
}
