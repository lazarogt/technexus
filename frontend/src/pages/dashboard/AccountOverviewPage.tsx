import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MetricCard } from "@/components/shared/MetricCard";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { listOrders } from "@/features/api/order-api";
import { useAuth } from "@/features/auth/auth-context";
import { getUserRoleLabel } from "@/i18n/es";
import { formatCurrency } from "@/lib/format";

export function AccountOverviewPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const ordersQuery = useQuery({
    queryKey: ["account", "orders", "overview"],
    enabled: Boolean(token),
    queryFn: () => listOrders(token!)
  });

  const totalSpent = (ordersQuery.data?.orders ?? []).reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="stack-lg">
      <div className="metrics-grid">
        <MetricCard label={t("dashboard.accountOverview.ordersLabel")} value={String(ordersQuery.data?.orders.length ?? 0)} description={t("dashboard.accountOverview.ordersDescription")} />
        <MetricCard label={t("dashboard.accountOverview.spentLabel")} value={formatCurrency(totalSpent)} description={t("dashboard.accountOverview.spentDescription")} />
        <MetricCard label={t("dashboard.accountOverview.activeStatusLabel")} value={String((ordersQuery.data?.orders ?? []).filter((order) => order.status !== "delivered").length)} description={t("dashboard.accountOverview.activeStatusDescription")} />
      </div>
      <SurfaceCard title={t("dashboard.accountOverview.profileTitle")} description={t("dashboard.accountOverview.profileDescription")}>
        <div className="profile-block">
          <strong>{user?.name}</strong>
          <p>{user?.email}</p>
          <p>{t("dashboard.accountOverview.roleLine", { role: user?.role ? getUserRoleLabel(user.role) : "-" })}</p>
        </div>
      </SurfaceCard>
    </div>
  );
}
