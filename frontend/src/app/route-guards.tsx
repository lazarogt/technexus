import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";

type ProtectedRouteProps = {
  roles?: Array<"admin" | "seller" | "customer">;
};

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { isBootstrapping, isAuthenticated, role } = useAuth();

  if (isBootstrapping) {
    return <div className="page-loader">{t("routeGuards.checkingAccess")}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && role && !roles.includes(role)) {
    return <Navigate to={role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/account"} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { t } = useTranslation();
  const { isBootstrapping, isAuthenticated, role } = useAuth();

  if (isBootstrapping) {
    return <div className="page-loader">{t("routeGuards.loadingSession")}</div>;
  }

  if (isAuthenticated) {
    return <Navigate to={role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/account"} replace />;
  }

  return <Outlet />;
}
