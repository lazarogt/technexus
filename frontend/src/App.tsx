import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { PanelSkeleton } from "./components/ui/PanelSkeleton";
import { useSession } from "./lib/auth-context";
import { getRoleDashboardPath } from "./lib/site-routes";
import type { UserRole } from "./lib/types";

const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const CustomerDashboardPage = lazy(() => import("./pages/CustomerDashboardPage"));
const SellerDashboardPage = lazy(() => import("./pages/SellerDashboardPage"));
const AdminOpsPage = lazy(() => import("./pages/AdminOpsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function RouteFallback() {
  return (
    <PanelSkeleton lines={5} />
  );
}

function GuestOnlyRoute() {
  const { isAuthenticated, role, isProfileLoading } = useSession();

  if (isAuthenticated && isProfileLoading) {
    return <RouteFallback />;
  }

  if (isAuthenticated) {
    return <Navigate replace to={getRoleDashboardPath(role)} />;
  }

  return <Outlet />;
}

function ProtectedRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const location = useLocation();
  const { isAuthenticated, role, isProfileLoading } = useSession();

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (isProfileLoading || !role) {
    return <RouteFallback />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate replace to={getRoleDashboardPath(role)} />;
  }

  return <Outlet />;
}

function DashboardRedirect() {
  const { isAuthenticated, role, isProfileLoading } = useSession();

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  if (isProfileLoading) {
    return <RouteFallback />;
  }

  return <Navigate replace to={getRoleDashboardPath(role)} />;
}

function HomeRoute() {
  const { isAuthenticated, role, isProfileLoading } = useSession();

  if (isAuthenticated && isProfileLoading) {
    return <RouteFallback />;
  }

  if (role === "seller" || role === "admin") {
    return <Navigate replace to={getRoleDashboardPath(role)} />;
  }

  return <MarketplacePage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<GuestOnlyRoute />}>
            <Route element={<LoginPage />} path="/login" />
            <Route element={<RegisterPage />} path="/register" />
          </Route>

          <Route element={<AppShell />}>
            <Route element={<HomeRoute />} path="/" />
            <Route element={<MarketplacePage />} path="/marketplace" />
            <Route element={<ProductPage />} path="/product/:id" />
            <Route element={<DashboardRedirect />} path="/dashboard" />

            <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
              <Route element={<CustomerDashboardPage />} path="/customer/dashboard" />
              <Route element={<CheckoutPage />} path="/checkout" />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["seller"]} />}>
              <Route element={<SellerDashboardPage />} path="/seller/dashboard" />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route element={<AdminOpsPage />} path="/admin/ops" />
            </Route>

            <Route element={<NotFoundPage />} path="*" />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
