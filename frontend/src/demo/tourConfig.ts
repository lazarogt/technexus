import type { Step } from "react-joyride";
import type { TFunction } from "i18next";
import type { UserRole } from "@/features/api/types";

export type DemoRole = UserRole;

export type DemoTourStep = Step & {
  id: string;
  route?: string;
  requiredRole?: DemoRole;
  fallbackToCenter?: boolean;
};

export function getDashboardPath(role: DemoRole) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "seller") {
    return "/seller";
  }

  return "/account";
}

export function getDemoTourSteps(t: TFunction): DemoTourStep[] {
  return [
    {
      id: "navbar",
      target: ".navbar",
      content: t("demo.steps.navbar"),
      skipBeacon: true,
      route: "/"
    },
    {
      id: "search-bar",
      target: ".search-bar",
      content: t("demo.steps.searchBar"),
      route: "/"
    },
    {
      id: "product-card",
      target: ".product-card",
      content: t("demo.steps.productCard"),
      route: "/",
      placement: "top"
    },
    {
      id: "cart-button",
      target: ".cart-button",
      content: t("demo.steps.cartButton"),
      route: "/"
    },
    {
      id: "role-switch",
      target: ".role-switch",
      content: t("demo.steps.roleSwitch"),
      route: "/",
      requiredRole: "customer"
    },
    {
      id: "dashboard-link",
      target: ".dashboard-link",
      content: t("demo.steps.dashboardLink"),
      route: "/",
      requiredRole: "customer"
    },
    {
      id: "seller-dashboard",
      target: '[data-tour="dashboard-overview"]',
      content: t("demo.steps.sellerOverview"),
      route: "/seller",
      requiredRole: "seller",
      fallbackToCenter: true,
      skipBeacon: true
    },
    {
      id: "admin-dashboard",
      target: '[data-tour="dashboard-overview"]',
      content: t("demo.steps.adminOverview"),
      route: "/admin",
      requiredRole: "admin",
      fallbackToCenter: true,
      skipBeacon: true
    }
  ];
}
