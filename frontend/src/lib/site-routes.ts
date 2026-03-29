import type { UserRole } from "./types";

type SessionSnapshot = {
  isAuthenticated: boolean;
  role: UserRole | null;
};

export const getRoleDashboardPath = (role: UserRole | null | undefined): string => {
  switch (role) {
    case "seller":
      return "/seller/dashboard";
    case "admin":
      return "/admin/ops";
    case "customer":
      return "/customer/dashboard";
    default:
      return "/";
  }
};

export const isMarketplaceExperiencePath = (pathname: string): boolean => {
  return (
    pathname === "/" ||
    pathname === "/marketplace" ||
    pathname.startsWith("/product/")
  );
};

export const getSiteRoutes = ({ isAuthenticated, role }: SessionSnapshot) => {
  if (!isAuthenticated) {
    return [
      { label: "Marketplace", path: "/" },
      { label: "Login", path: "/login" },
      { label: "Register", path: "/register" }
    ];
  }

  if (role === "customer") {
    return [
      { label: "Marketplace", path: "/" },
      { label: "Dashboard", path: "/customer/dashboard" },
      { label: "Checkout", path: "/checkout" }
    ];
  }

  if (role === "seller") {
    return [{ label: "Seller Dashboard", path: "/seller/dashboard" }];
  }

  return [{ label: "Admin Ops", path: "/admin/ops" }];
};

export const sidebarFilterGroups = [
  {
    title: "Category",
    items: ["Laptops", "Accessories", "Networking", "Audio"]
  },
  {
    title: "Price",
    items: ["Under $50", "$50 - $250", "$250 - $1000", "$1000+"]
  },
  {
    title: "Seller",
    items: ["Top Rated", "Local", "Verified", "Fast Ship"]
  }
] as const;

export const getFooterLinks = ({ isAuthenticated, role }: SessionSnapshot) => {
  const links = isAuthenticated
    ? [
        { label: "Dashboard", href: getRoleDashboardPath(role) },
        ...(role === "customer" ? [{ label: "Marketplace", href: "/" }] : [])
      ]
    : [
        { label: "Marketplace", href: "/" },
        { label: "Login", href: "/login" },
        { label: "Register", href: "/register" }
      ];

  return [
    ...links,
    { label: "Support", href: "mailto:support@technexus.local" }
  ];
};
