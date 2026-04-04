import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MetricCard } from "@/components/shared/MetricCard";
import { SelectField } from "@/components/shared/SelectField";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { getAnalyticsOverview } from "@/features/api/dashboard-api";
import type { AnalyticsRange } from "@/features/api/types";
import { useAuth } from "@/features/auth/auth-context";
import { clampText, formatDate } from "@/lib/format";

export function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const rangeOptions = [
    { value: "24h", label: t("dashboard.adminAnalytics.range24h") },
    { value: "7d", label: t("dashboard.adminAnalytics.range7d") },
    { value: "30d", label: t("dashboard.adminAnalytics.range30d") }
  ] satisfies Array<{ value: AnalyticsRange; label: string }>;
  const overviewQuery = useQuery({
    queryKey: ["admin", "analytics", range],
    enabled: Boolean(token),
    queryFn: () => getAnalyticsOverview(token!, range)
  });

  const overview = overviewQuery.data;

  if (!overview) {
    return (
      <div className="stack-lg" data-testid="admin-analytics-page">
        <SurfaceCard title={t("dashboard.analytics")} description={t("dashboard.adminAnalytics.loadingDescription")} />
      </div>
    );
  }

  if (overview.provider !== "internal") {
    return (
      <div className="stack-lg" data-testid="admin-analytics-page">
        <SurfaceCard title={t("dashboard.localAnalytics")} description={t("dashboard.adminAnalytics.providerDescription")}>
          <p data-testid="analytics-provider-info">
            {t("dashboard.adminAnalytics.providerInfo", { provider: overview.provider })}
          </p>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="stack-lg" data-testid="admin-analytics-page">
      <SurfaceCard
        title={t("dashboard.localAnalytics")}
        description={t("dashboard.adminAnalytics.funnelDescription", { range: overview.range })}
        action={
          <div style={{ minWidth: 220 }}>
            <SelectField
              label={t("labels.range")}
              options={rangeOptions}
              value={range}
              onChange={(event) => setRange(event.target.value as AnalyticsRange)}
            />
          </div>
        }
      >
        <div className="metrics-grid" data-testid="analytics-metrics">
          <MetricCard label={t("dashboard.adminAnalytics.sessionsLabel")} value={String(overview.totalSessions)} description={t("dashboard.adminAnalytics.sessionsDescription")} />
          <MetricCard label={t("dashboard.adminAnalytics.viewProductLabel")} value={String(overview.funnel.viewProduct)} description={t("dashboard.adminAnalytics.viewProductDescription")} />
          <MetricCard label={t("dashboard.adminAnalytics.addToCartLabel")} value={String(overview.funnel.addToCart)} description={t("dashboard.adminAnalytics.addToCartDescription")} />
          <MetricCard label={t("dashboard.adminAnalytics.startCheckoutLabel")} value={String(overview.funnel.startCheckout)} description={t("dashboard.adminAnalytics.startCheckoutDescription")} />
          <MetricCard label={t("dashboard.adminAnalytics.completeOrderLabel")} value={String(overview.funnel.completeOrder)} description={t("dashboard.adminAnalytics.completeOrderDescription")} />
          <MetricCard label={t("dashboard.adminAnalytics.addRateLabel")} value={`${overview.funnel.addToCartRate}%`} description={t("dashboard.adminAnalytics.addRateDescription")} />
          <MetricCard label={t("dashboard.adminAnalytics.cartRateLabel")} value={`${overview.funnel.cartViewRate}%`} description={t("dashboard.adminAnalytics.cartRateDescription")} />
          <MetricCard label={t("dashboard.adminAnalytics.completionRateLabel")} value={`${overview.funnel.checkoutCompletionRate}%`} description={t("dashboard.adminAnalytics.completionRateDescription")} />
        </div>
      </SurfaceCard>

      <div className="dashboard-grid">
        <SurfaceCard title={t("dashboard.adminAnalytics.topViewedTitle")} description={t("dashboard.adminAnalytics.topViewedDescription")}>
          <ul className="compact-list">
            {overview.topProducts.views.map((product) => (
              <li key={`view-${product.productId}`}>
                {product.productName}: {product.count}
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard title={t("dashboard.adminAnalytics.topAddedTitle")} description={t("dashboard.adminAnalytics.topAddedDescription")}>
          <ul className="compact-list">
            {overview.topProducts.carts.map((product) => (
              <li key={`cart-${product.productId}`}>
                {product.productName}: {product.count}
              </li>
            ))}
          </ul>
        </SurfaceCard>
      </div>

      <SurfaceCard title={t("dashboard.adminAnalytics.recentEventsTitle")} description={t("dashboard.adminAnalytics.recentEventsDescription", { date: formatDate(overview.generatedAt) })}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("labels.event")}</th>
                <th>{t("labels.session")}</th>
                <th>{t("labels.user")}</th>
                <th>{t("labels.data")}</th>
                <th>{t("labels.date")}</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentEvents.map((event) => (
                <tr key={event.id}>
                  <td>{event.event}</td>
                  <td>{clampText(event.sessionId, 18)}</td>
                  <td>{event.userId ? clampText(event.userId, 18) : t("labels.guest")}</td>
                  <td>{event.data ? clampText(JSON.stringify(event.data), 72) : "-"}</td>
                  <td>{formatDate(event.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
