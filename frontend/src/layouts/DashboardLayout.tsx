import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { accountNavigation, adminNavigation, sellerNavigation } from "@/lib/routes";

type DashboardLayoutProps = {
  section: "account" | "seller" | "admin";
};

const copy = {
  account: {
    title: "Mi cuenta",
    subtitle: "Revisa pedidos, dirección y estado de compra.",
    nav: accountNavigation
  },
  seller: {
    title: "Seller workspace",
    subtitle: "Gestiona catálogo, inventario y órdenes sin mezclar la tienda pública.",
    nav: sellerNavigation
  },
  admin: {
    title: "Admin control center",
    subtitle: "Supervisa marketplace, usuarios y operaciones de correo.",
    nav: adminNavigation
  }
} as const;

export function DashboardLayout({ section }: DashboardLayoutProps) {
  const current = copy[section];

  return (
    <div className="dashboard-layout">
      <Sidebar items={current.nav} title={current.title} />
      <div className="dashboard-content">
        <Topbar title={current.title} subtitle={current.subtitle} />
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
