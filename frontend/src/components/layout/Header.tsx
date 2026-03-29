import { startTransition } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useSession } from "../../lib/auth-context";
import {
  getRoleDashboardPath,
  getSiteRoutes,
  isMarketplaceExperiencePath
} from "../../lib/site-routes";
import { useMarketplaceFilters } from "../../lib/marketplace-context";
import { Logo } from "../atomic/Logo";
import { NavItem } from "../molecules/NavItem";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

type HeaderProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export function Header({ isSidebarOpen, onToggleSidebar }: HeaderProps) {
  const location = useLocation();
  const { token, user, role, isAuthenticated, isProfileLoading, logout } = useSession();
  const cartQuery = useCart(token, {
    enabled: role === "customer"
  });
  const { searchInput, setSearchInput } = useMarketplaceFilters();
  const routes = getSiteRoutes({
    isAuthenticated,
    role
  });
  const canUseCart = role === "customer";
  const showSearch = isMarketplaceExperiencePath(location.pathname) && (!isAuthenticated || canUseCart);
  const cartItemsCount =
    cartQuery.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const initials = user?.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("") || "GU";
  const userLabel = user ? `${user.role} account` : "Guest access";
  const userPath = getRoleDashboardPath(role);

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-shell/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            aria-expanded={isSidebarOpen}
            aria-label="Toggle filters menu"
            className="h-11 w-11 rounded-2xl px-0 lg:hidden"
            onClick={onToggleSidebar}
            type="button"
            variant="secondary"
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </Button>
          <Logo />
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            {routes.map((route) => (
              <NavItem key={route.path} label={route.label} path={route.path} />
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          {showSearch ? (
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-xs font-bold uppercase tracking-[0.18em] text-slate">
                Search
              </span>
              <Input
                aria-label="Search products"
                className="pl-24"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  startTransition(() => {
                    setSearchInput(nextValue);
                  });
                }}
                placeholder="Search products or sellers"
                type="search"
                value={searchInput}
              />
            </div>
          ) : (
            <div className="rounded-[24px] border border-black/8 bg-white px-4 py-3">
              <span className="block text-xs uppercase tracking-[0.18em] text-slate">Active surface</span>
              <span className="mt-1 block text-sm font-semibold text-ink">
                {isAuthenticated ? userLabel : "Guest browsing"}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {canUseCart ? (
              <Link aria-label="Open cart and checkout" className="action-secondary gap-2" to="/checkout">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-mist text-xs font-bold text-ink">
                  {cartItemsCount}
                </span>
                <span>Cart</span>
              </Link>
            ) : null}

            {isAuthenticated ? (
              <>
                <Link
                  aria-label={`Open ${userLabel}`}
                  className="action-secondary justify-between gap-3 lg:min-w-[180px]"
                  to={userPath}
                >
                  <span className="text-left">
                    <span className="block text-xs uppercase tracking-[0.18em] text-slate">User</span>
                    <span className="block text-sm font-semibold text-ink">
                      {isProfileLoading ? "Loading profile..." : userLabel}
                    </span>
                  </span>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pine text-sm font-bold text-white">
                    {initials}
                  </span>
                </Link>
                <Button onClick={logout} type="button" variant="secondary">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link className="action-secondary" to="/login">
                  Login
                </Link>
                <Link className="action-primary" to="/register">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
