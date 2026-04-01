import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "@/app/route-guards";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { StoreLayout } from "@/layouts/StoreLayout";

const HomePage = lazy(() => import("@/pages/store/HomePage").then((module) => ({ default: module.HomePage })));
const ProductsPage = lazy(() => import("@/pages/store/ProductsPage").then((module) => ({ default: module.ProductsPage })));
const CategoryPage = lazy(() => import("@/pages/store/CategoryPage").then((module) => ({ default: module.CategoryPage })));
const ProductPage = lazy(() => import("@/pages/store/ProductPage").then((module) => ({ default: module.ProductPage })));
const CartPage = lazy(() => import("@/pages/store/CartPage").then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import("@/pages/store/CheckoutPage").then((module) => ({ default: module.CheckoutPage })));
const LoginPage = lazy(() => import("@/pages/store/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/store/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const AccountOverviewPage = lazy(() =>
  import("@/pages/dashboard/AccountOverviewPage").then((module) => ({ default: module.AccountOverviewPage }))
);
const AccountOrdersPage = lazy(() =>
  import("@/pages/dashboard/AccountOrdersPage").then((module) => ({ default: module.AccountOrdersPage }))
);
const SellerOverviewPage = lazy(() =>
  import("@/pages/dashboard/SellerOverviewPage").then((module) => ({ default: module.SellerOverviewPage }))
);
const SellerProductsPage = lazy(() =>
  import("@/pages/dashboard/SellerProductsPage").then((module) => ({ default: module.SellerProductsPage }))
);
const SellerOrdersPage = lazy(() =>
  import("@/pages/dashboard/SellerOrdersPage").then((module) => ({ default: module.SellerOrdersPage }))
);
const SellerInventoryPage = lazy(() =>
  import("@/pages/dashboard/SellerInventoryPage").then((module) => ({ default: module.SellerInventoryPage }))
);
const AdminOverviewPage = lazy(() =>
  import("@/pages/dashboard/AdminOverviewPage").then((module) => ({ default: module.AdminOverviewPage }))
);
const AdminAnalyticsPage = lazy(() =>
  import("@/pages/dashboard/AdminAnalyticsPage").then((module) => ({ default: module.AdminAnalyticsPage }))
);
const AdminProductsPage = lazy(() =>
  import("@/pages/dashboard/AdminProductsPage").then((module) => ({ default: module.AdminProductsPage }))
);
const AdminCategoriesPage = lazy(() =>
  import("@/pages/dashboard/AdminCategoriesPage").then((module) => ({ default: module.AdminCategoriesPage }))
);
const AdminUsersPage = lazy(() =>
  import("@/pages/dashboard/AdminUsersPage").then((module) => ({ default: module.AdminUsersPage }))
);
const AdminOrdersPage = lazy(() =>
  import("@/pages/dashboard/AdminOrdersPage").then((module) => ({ default: module.AdminOrdersPage }))
);
const AdminOperationsPage = lazy(() =>
  import("@/pages/dashboard/AdminOperationsPage").then((module) => ({ default: module.AdminOperationsPage }))
);
const NotFoundPage = lazy(() => import("@/pages/store/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

export const appRouter = createBrowserRouter([
  {
    element: <StoreLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "category/:id", element: <CategoryPage /> },
      { path: "product/:id", element: <ProductPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> }
        ]
      }
    ]
  },
  {
    element: <ProtectedRoute roles={["customer", "seller", "admin"]} />,
    children: [
      {
        path: "/account",
        element: <DashboardLayout section="account" />,
        children: [
          { index: true, element: <AccountOverviewPage /> },
          { path: "orders", element: <AccountOrdersPage /> }
        ]
      }
    ]
  },
  {
    element: <ProtectedRoute roles={["seller", "admin"]} />,
    children: [
      {
        path: "/seller",
        element: <DashboardLayout section="seller" />,
        children: [
          { index: true, element: <SellerOverviewPage /> },
          { path: "products", element: <SellerProductsPage /> },
          { path: "orders", element: <SellerOrdersPage /> },
          { path: "inventory", element: <SellerInventoryPage /> }
        ]
      }
    ]
  },
  {
    element: <ProtectedRoute roles={["admin"]} />,
    children: [
      {
        path: "/admin",
        element: <DashboardLayout section="admin" />,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: "analytics", element: <AdminAnalyticsPage /> },
          { path: "products", element: <AdminProductsPage /> },
          { path: "categories", element: <AdminCategoriesPage /> },
          { path: "users", element: <AdminUsersPage /> },
          { path: "orders", element: <AdminOrdersPage /> },
          { path: "operations", element: <AdminOperationsPage /> }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
