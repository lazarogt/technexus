import type { Step } from "react-joyride";
import type { TFunction } from "i18next";
import type { UserRole } from "@/features/api/types";

export type DemoRole = UserRole;
export type DemoStep = "STORE" | "CART" | "CHECKOUT" | "SELLER" | "ADMIN" | "DONE";

export type DemoTourStep = Step & {
  id: string;
  phase: DemoStep;
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
      phase: "STORE",
      target: ".navbar",
      content: t("demo.steps.navbar"),
      skipBeacon: true,
      route: "/",
      requiredRole: "customer"
    },
    {
      id: "search-bar",
      phase: "STORE",
      target: ".search-bar",
      content: t("demo.steps.searchBar"),
      route: "/",
      requiredRole: "customer"
    },
    {
      id: "product-card",
      phase: "STORE",
      target: ".product-card",
      content: t("demo.steps.productCard"),
      route: "/",
      placement: "top",
      requiredRole: "customer"
    },
    {
      id: "cart-button",
      phase: "CART",
      target: ".cart-button",
      content: t("demo.steps.cartButton"),
      route: "/",
      requiredRole: "customer"
    },
    {
      id: "checkout-preview",
      phase: "CHECKOUT",
      target: "body",
      content: t("demo.steps.checkout"),
      route: "/checkout",
      requiredRole: "customer",
      placement: "center",
      skipBeacon: true,
      fallbackToCenter: true
    },
    {
      id: "seller-dashboard",
      phase: "SELLER",
      target: '[data-tour="dashboard-overview"]',
      content: t("demo.steps.sellerOverview"),
      route: "/seller",
      requiredRole: "seller",
      fallbackToCenter: true,
      skipBeacon: true
    },
    {
      id: "admin-dashboard",
      phase: "ADMIN",
      target: '[data-tour="dashboard-overview"]',
      content: t("demo.steps.adminOverview"),
      route: "/admin",
      requiredRole: "admin",
      fallbackToCenter: true,
      skipBeacon: true
    }
  ];
}
