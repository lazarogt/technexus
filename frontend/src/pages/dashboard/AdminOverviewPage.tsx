import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/shared/MetricCard";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { listUsers } from "@/features/api/admin-api";
import { listProducts } from "@/features/api/catalog-api";
import { getMetrics } from "@/features/api/dashboard-api";
import { listInventoryAlerts } from "@/features/api/inventory-api";
import { listOrders } from "@/features/api/order-api";
import { useAuth } from "@/features/auth/auth-context";

export function AdminOverviewPage() {
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
        <MetricCard label="Productos" value={String(productsQuery.data?.products.length ?? 0)} description="Catálogo global visible." />
        <MetricCard label="Usuarios" value={String(usersQuery.data?.users.length ?? 0)} description="Usuarios activos del marketplace." />
        <MetricCard label="Pedidos" value={String(ordersQuery.data?.orders.length ?? 0)} description="Órdenes consolidadas." />
        <MetricCard label="Outbox pendiente" value={String(metricsQuery.data?.email_outbox_pending ?? 0)} description="Cola de correos por procesar." />
      </div>
      <SurfaceCard title="Riesgos operativos" description="Alertas de inventario abiertas a nivel plataforma.">
        <ul className="compact-list">
          {(alertsQuery.data?.alerts ?? []).map((alert) => (
            <li key={alert.id}>
              {alert.productName} / {alert.locationName}: {alert.triggeredQty} unidades.
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </div>
  );
}
