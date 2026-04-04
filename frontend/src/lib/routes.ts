import type { LucideIcon } from "lucide-react";
import { BarChart3, Boxes, LayoutDashboard, PackageSearch, ShoppingBag, ShieldCheck, Users, Warehouse, ReceiptText, MailWarning } from "lucide-react";

export type NavigationItem = {
  labelKey: string;
  href: string;
  icon: LucideIcon;
};

export const accountNavigation: NavigationItem[] = [
  { labelKey: "dashboard.navigation.account.overview", href: "/account", icon: LayoutDashboard },
  { labelKey: "dashboard.navigation.account.orders", href: "/account/orders", icon: ShoppingBag }
];

export const sellerNavigation: NavigationItem[] = [
  { labelKey: "dashboard.navigation.seller.overview", href: "/seller", icon: LayoutDashboard },
  { labelKey: "dashboard.navigation.seller.products", href: "/seller/products", icon: Boxes },
  { labelKey: "dashboard.navigation.seller.orders", href: "/seller/orders", icon: ReceiptText },
  { labelKey: "dashboard.navigation.seller.inventory", href: "/seller/inventory", icon: Warehouse }
];

export const adminNavigation: NavigationItem[] = [
  { labelKey: "dashboard.navigation.admin.overview", href: "/admin", icon: ShieldCheck },
  { labelKey: "dashboard.navigation.admin.analytics", href: "/admin/analytics", icon: BarChart3 },
  { labelKey: "dashboard.navigation.admin.products", href: "/admin/products", icon: Boxes },
  { labelKey: "dashboard.navigation.admin.categories", href: "/admin/categories", icon: PackageSearch },
  { labelKey: "dashboard.navigation.admin.users", href: "/admin/users", icon: Users },
  { labelKey: "dashboard.navigation.admin.orders", href: "/admin/orders", icon: ReceiptText },
  { labelKey: "dashboard.navigation.admin.operations", href: "/admin/operations", icon: MailWarning }
];
