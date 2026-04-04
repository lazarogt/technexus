import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MetricCard } from "@/components/shared/MetricCard";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { listSellerProducts } from "@/features/api/catalog-api";
import { listInventoryAlerts } from "@/features/api/inventory-api";
import { listSellerOrders } from "@/features/api/order-api";
import { useAuth } from "@/features/auth/auth-context";
import { formatCurrency } from "@/lib/format";

export function SellerOverviewPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const productsQuery = useQuery({
    queryKey: ["seller", "products", "overview"],
    enabled: Boolean(token),
    queryFn: () => listSellerProducts(token!)
  });
  const ordersQuery = useQuery({
    queryKey: ["seller", "orders", "overview"],
    enabled: Boolean(token),
    queryFn: () => listSellerOrders(token!)
  });
  const alertsQuery = useQuery({
    queryKey: ["seller", "alerts"],
    enabled: Boolean(token),
    queryFn: () => listInventoryAlerts(token!)
  });

  const sellerSubtotal = (ordersQuery.data?.orders ?? []).reduce((sum, order) => {
    return sum + order.items.reduce((itemSum, item) => itemSum + item.subtotal, 0);
  }, 0);

  return (
    <div className="stack-lg">
      <div className="metrics-grid">
        <MetricCard label={t("dashboard.sellerOverview.productsLabel")} value={String(productsQuery.data?.products.length ?? 0)} description={t("dashboard.sellerOverview.productsDescription")} />
        <MetricCard label={t("dashboard.sellerOverview.ordersLabel")} value={String(ordersQuery.data?.orders.length ?? 0)} description={t("dashboard.sellerOverview.ordersDescription")} />
        <MetricCard label={t("dashboard.sellerOverview.billingLabel")} value={formatCurrency(sellerSubtotal)} description={t("dashboard.sellerOverview.billingDescription")} />
        <MetricCard label={t("dashboard.sellerOverview.alertsLabel")} value={String(alertsQuery.data?.alerts.length ?? 0)} description={t("dashboard.sellerOverview.alertsDescription")} />
      </div>
      <SurfaceCard title={t("dashboard.sellerOverview.risksTitle")} description={t("dashboard.sellerOverview.risksDescription")}>
        <ul className="compact-list">
          {(alertsQuery.data?.alerts ?? []).slice(0, 5).map((alert) => (
            <li key={alert.id}>
              {t("dashboard.sellerOverview.alertRow", {
                productName: alert.productName,
                locationName: alert.locationName,
                triggeredQty: alert.triggeredQty,
                threshold: alert.threshold
              })}
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </div>
  );
}
