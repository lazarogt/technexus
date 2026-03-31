import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/shared/MetricCard";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { listSellerProducts } from "@/features/api/catalog-api";
import { listInventoryAlerts } from "@/features/api/inventory-api";
import { listSellerOrders } from "@/features/api/order-api";
import { useAuth } from "@/features/auth/auth-context";
import { formatCurrency } from "@/lib/format";

export function SellerOverviewPage() {
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
        <MetricCard label="Productos" value={String(productsQuery.data?.products.length ?? 0)} description="Activos en tu catálogo." />
        <MetricCard label="Pedidos" value={String(ordersQuery.data?.orders.length ?? 0)} description="Órdenes asignadas a tu tienda." />
        <MetricCard label="Facturación visible" value={formatCurrency(sellerSubtotal)} description="Suma de subtotales por item vendido." />
        <MetricCard label="Alertas de stock" value={String(alertsQuery.data?.alerts.length ?? 0)} description="Bajo umbral en inventario." />
      </div>
      <SurfaceCard title="Riesgos operativos" description="Alertas abiertas en inventario.">
        <ul className="compact-list">
          {(alertsQuery.data?.alerts ?? []).slice(0, 5).map((alert) => (
            <li key={alert.id}>
              {alert.productName} en {alert.locationName}: {alert.triggeredQty} / umbral {alert.threshold}
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </div>
  );
}
