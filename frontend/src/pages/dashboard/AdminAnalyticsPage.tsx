import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MetricCard } from "@/components/shared/MetricCard";
import { SelectField } from "@/components/shared/SelectField";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { getAnalyticsOverview } from "@/features/api/dashboard-api";
import type { AnalyticsRange } from "@/features/api/types";
import { useAuth } from "@/features/auth/auth-context";
import { clampText, formatDate } from "@/lib/format";

const rangeOptions = [
  { value: "24h", label: "Ultimas 24 horas" },
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "30d", label: "Ultimos 30 dias" }
] satisfies Array<{ value: AnalyticsRange; label: string }>;

export function AdminAnalyticsPage() {
  const { token } = useAuth();
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const overviewQuery = useQuery({
    queryKey: ["admin", "analytics", range],
    enabled: Boolean(token),
    queryFn: () => getAnalyticsOverview(token!, range)
  });

  const overview = overviewQuery.data;

  if (!overview) {
    return (
      <div className="stack-lg" data-testid="admin-analytics-page">
        <SurfaceCard title="Analytics" description="Preparando el resumen del funnel y la actividad reciente." />
      </div>
    );
  }

  if (overview.provider !== "internal") {
    return (
      <div className="stack-lg" data-testid="admin-analytics-page">
        <SurfaceCard title="Analytics local" description="El dashboard local solo muestra metricas cuando el provider es internal.">
          <p data-testid="analytics-provider-info">
            El entorno actual esta configurado con <strong>{overview.provider}</strong>. Mantuvimos la
            integracion de eventos, pero el tablero local necesita `VITE_ANALYTICS_PROVIDER=internal`
            y `ANALYTICS_PROVIDER=internal`.
          </p>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="stack-lg" data-testid="admin-analytics-page">
      <SurfaceCard
        title="Analytics local"
        description={`Embudo y comportamiento de sesion para el rango ${overview.range}.`}
        action={
          <div style={{ minWidth: 220 }}>
            <SelectField
              label="Rango"
              options={rangeOptions}
              value={range}
              onChange={(event) => setRange(event.target.value as AnalyticsRange)}
            />
          </div>
        }
      >
        <div className="metrics-grid" data-testid="analytics-metrics">
          <MetricCard label="Sesiones" value={String(overview.totalSessions)} description="Sesiones distintas con eventos en el rango." />
          <MetricCard label="Views producto" value={String(overview.funnel.viewProduct)} description="Veces que una ficha de producto fue abierta." />
          <MetricCard label="Add to cart" value={String(overview.funnel.addToCart)} description="Eventos exitosos de agregado al carrito." />
          <MetricCard label="Checkout start" value={String(overview.funnel.startCheckout)} description="Usuarios que avanzaron el primer paso del checkout." />
          <MetricCard label="Ordenes" value={String(overview.funnel.completeOrder)} description="Pedidos confirmados desde el flujo de compra." />
          <MetricCard label="ATC rate" value={`${overview.funnel.addToCartRate}%`} description="Relacion entre views de producto y add-to-cart." />
          <MetricCard label="Cart view rate" value={`${overview.funnel.cartViewRate}%`} description="Relacion entre add-to-cart y vistas de carrito." />
          <MetricCard label="Checkout completion" value={`${overview.funnel.checkoutCompletionRate}%`} description="Relacion entre inicio de checkout y orden completada." />
        </div>
      </SurfaceCard>

      <div className="dashboard-grid">
        <SurfaceCard title="Productos mas vistos" description="Top por eventos view_product.">
          <ul className="compact-list">
            {overview.topProducts.views.map((product) => (
              <li key={`view-${product.productId}`}>
                {product.productName}: {product.count}
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard title="Productos mas agregados" description="Top por eventos add_to_cart.">
          <ul className="compact-list">
            {overview.topProducts.carts.map((product) => (
              <li key={`cart-${product.productId}`}>
                {product.productName}: {product.count}
              </li>
            ))}
          </ul>
        </SurfaceCard>
      </div>

      <SurfaceCard title="Eventos recientes" description={`Generado ${formatDate(overview.generatedAt)}.`}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Sesion</th>
                <th>Usuario</th>
                <th>Data</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentEvents.map((event) => (
                <tr key={event.id}>
                  <td>{event.event}</td>
                  <td>{clampText(event.sessionId, 18)}</td>
                  <td>{event.userId ? clampText(event.userId, 18) : "Guest"}</td>
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
