import type { LucideIcon } from "lucide-react";
import { BarChart3, Boxes, LayoutDashboard, PackageSearch, ShoppingBag, ShieldCheck, Users, Warehouse, ReceiptText, MailWarning } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const accountNavigation: NavigationItem[] = [
  { label: "Resumen", href: "/account", icon: LayoutDashboard },
  { label: "Pedidos", href: "/account/orders", icon: ShoppingBag }
];

export const sellerNavigation: NavigationItem[] = [
  { label: "Resumen", href: "/seller", icon: LayoutDashboard },
  { label: "Productos", href: "/seller/products", icon: Boxes },
  { label: "Pedidos", href: "/seller/orders", icon: ReceiptText },
  { label: "Inventario", href: "/seller/inventory", icon: Warehouse }
];

export const adminNavigation: NavigationItem[] = [
  { label: "Resumen", href: "/admin", icon: ShieldCheck },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Productos", href: "/admin/products", icon: Boxes },
  { label: "Categorías", href: "/admin/categories", icon: PackageSearch },
  { label: "Usuarios", href: "/admin/users", icon: Users },
  { label: "Pedidos", href: "/admin/orders", icon: ReceiptText },
  { label: "Operaciones", href: "/admin/operations", icon: MailWarning }
];
