import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/shared/MetricCard";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { listOrders } from "@/features/api/order-api";
import { useAuth } from "@/features/auth/auth-context";
import { formatCurrency } from "@/lib/format";

export function AccountOverviewPage() {
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
        <MetricCard label="Pedidos" value={String(ordersQuery.data?.orders.length ?? 0)} description="Historial del cliente autenticado." />
        <MetricCard label="Total invertido" value={formatCurrency(totalSpent)} description="Suma de órdenes visibles." />
        <MetricCard label="Estado activo" value={String((ordersQuery.data?.orders ?? []).filter((order) => order.status !== "delivered").length)} description="Pedidos aún en flujo." />
      </div>
      <SurfaceCard title="Perfil" description="Acceso rápido al estado de tu cuenta y próximos pasos.">
        <div className="profile-block">
          <strong>{user?.name}</strong>
          <p>{user?.email}</p>
          <p>Rol: {user?.role}</p>
        </div>
      </SurfaceCard>
    </div>
  );
}
