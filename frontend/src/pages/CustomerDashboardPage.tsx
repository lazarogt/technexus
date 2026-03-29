import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { useCart } from "../hooks/useCart";
import { useCustomerOrders } from "../hooks/useOrders";
import { useSession } from "../lib/auth-context";
import { currencyFormatter, dateFormatter } from "../lib/api";
import { statusLabelMap } from "../lib/types";
import { DataTable, type DataTableColumn } from "../components/dashboard/DataTable";
import type { Order } from "../lib/types";

export default function CustomerDashboardPage() {
  const { token, user } = useSession();
  const cartQuery = useCart(token, {
    enabled: user?.role === "customer"
  });
  const ordersQuery = useCustomerOrders(token);

  const cart = cartQuery.data ?? { items: [], total: 0 };
  const orders = ordersQuery.data?.orders ?? [];
  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const deliveredOrders = orders.filter((order) => order.status === "delivered").length;
  const totalSpent = orders.reduce((total, order) => total + order.total, 0);

  const orderColumns = useMemo<Array<DataTableColumn<Order>>>(
    () => [
      {
        id: "order",
        header: "Order",
        accessor: (order) => order.id,
        searchValue: (order) => `${order.id} ${order.userName} ${order.items.map((item) => item.productName).join(" ")}`,
        cell: (order) => (
          <div>
            <p className="font-semibold text-ink">#{order.id.slice(0, 8)}</p>
            <p className="mt-1 text-sm text-slate">{order.items.length} items</p>
          </div>
        )
      },
      {
        id: "createdAt",
        header: "Created",
        accessor: (order) => order.createdAt,
        sortable: true,
        cell: (order) => dateFormatter.format(new Date(order.createdAt))
      },
      {
        id: "status",
        header: "Status",
        accessor: (order) => order.status,
        sortable: true,
        cell: (order) => (
          <Badge variant={order.status === "delivered" ? "success" : order.status === "pending" ? "warning" : "info"}>
            {statusLabelMap[order.status]}
          </Badge>
        )
      },
      {
        id: "total",
        header: "Total",
        accessor: (order) => order.total,
        sortable: true,
        cell: (order) => currencyFormatter.format(order.total)
      }
    ],
    []
  );

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate">
        <Link className="font-semibold text-ink" to="/">
          Marketplace
        </Link>
        <span>/</span>
        <span>Customer Dashboard</span>
      </nav>

      <section className="panel-surface overflow-hidden bg-ink px-6 py-8 text-white sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div>
            <span className="inline-flex rounded-pill border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/70">
              Customer workspace
            </span>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-none sm:text-5xl">
              Track orders, cart state and checkout readiness from one place.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              This dashboard is wired to `/profile`, `/orders` and `/cart` with customer-only
              actions.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/8 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/54">Signed in as</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-white">{user?.name ?? "Customer"}</h2>
            <p className="mt-2 text-sm text-white/72">{user?.email}</p>
            <div className="mt-4">
              <Badge variant="info">{user?.role ?? "customer"}</Badge>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card eyebrow="Orders" title={orders.length} />
        <Card eyebrow="Pending" title={pendingOrders} />
        <Card eyebrow="Delivered" title={deliveredOrders} />
        <Card eyebrow="Total spent" title={currencyFormatter.format(totalSpent)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <DataTable
          caption="Customer orders"
          columns={orderColumns}
          description="Live order history from the customer orders endpoint."
          emptyMessage="No orders were found for this customer."
          rowKey={(order) => order.id}
          rows={orders}
          searchLabel="Search customer orders"
          searchPlaceholder="Search by order id or product name"
          title="Recent orders"
        />

        <div className="space-y-4">
          <Card title="Cart snapshot">
            <div className="space-y-3 text-sm text-slate">
              <div className="flex items-center justify-between">
                <span>Items in cart</span>
                <strong className="text-ink">
                  {cart.items.reduce((total, item) => total + item.quantity, 0)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Cart total</span>
                <strong className="text-ink">{currencyFormatter.format(cart.total)}</strong>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link className="action-primary" to="/">
                Browse marketplace
              </Link>
              <Link className="action-secondary" to="/checkout">
                Review checkout
              </Link>
            </div>
          </Card>

          <Card title="Operational notes">
            <div className="space-y-3 text-sm leading-7 text-slate">
              <p>Checkout remains cash on delivery and uses the current backend workflow.</p>
              <p>Seller and admin dashboards are blocked from this account.</p>
              <p>Order notifications continue flowing through the existing backend logic.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
