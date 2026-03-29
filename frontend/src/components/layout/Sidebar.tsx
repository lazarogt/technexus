import { useLocation, useNavigate } from "react-router-dom";
import { catalogSortOptions } from "../../lib/types";
import { useCategories } from "../../hooks/useCategories";
import { useProducts } from "../../hooks/useProducts";
import { useSession } from "../../lib/auth-context";
import { useMarketplaceFilters } from "../../lib/marketplace-context";
import {
  getRoleDashboardPath,
  getSiteRoutes,
  isMarketplaceExperiencePath
} from "../../lib/site-routes";
import { NavItem } from "../molecules/NavItem";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, isAuthenticated, logout } = useSession();
  const { data: categories = [] } = useCategories();
  const { sellerOptions } = useProducts();
  const showMarketplaceFilters =
    isMarketplaceExperiencePath(location.pathname) && (!isAuthenticated || role === "customer");
  const routes = getSiteRoutes({
    isAuthenticated,
    role
  });
  const {
    categoryId,
    priceBucket,
    sellerId,
    ratingFilter,
    inStockOnly,
    sort,
    setCategoryId,
    setPriceBucket,
    setSellerId,
    setRatingFilter,
    setInStockOnly,
    setSort,
    resetFilters
  } = useMarketplaceFilters();

  return (
    <>
      <button
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-20 bg-ink/35 transition lg:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        type="button"
      />
      <aside
        className={`panel-surface fixed inset-y-0 left-0 z-30 w-[84vw] max-w-[320px] overflow-y-auto rounded-none rounded-r-[28px] p-4 transition duration-200 lg:static lg:z-auto lg:block lg:h-fit lg:w-auto lg:max-w-none lg:rounded-[28px] ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between lg:hidden">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate">Filters</p>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>

        <div className="mt-4 lg:mt-0">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate">Navigate</p>
          <nav className="mt-4 flex flex-col gap-2">
            {routes.map((route) => (
              <NavItem key={route.path} label={route.label} path={route.path} />
            ))}
          </nav>
        </div>

        {showMarketplaceFilters ? (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate">
                Marketplace filters
              </p>
              <button className="text-sm font-semibold text-pine" onClick={resetFilters} type="button">
                Reset
              </button>
            </div>

            <Select
              label="Category"
              onChange={(event) => setCategoryId(event.target.value)}
              options={[
                { label: "All categories", value: "" },
                ...categories.map((category) => ({ label: category.name, value: category.id }))
              ]}
              value={categoryId}
            />

            <Select
              label="Price"
              onChange={(event) => setPriceBucket(event.target.value as typeof priceBucket)}
              options={[
                { label: "All prices", value: "all" },
                { label: "Under $50", value: "under-50" },
                { label: "$50 - $250", value: "50-250" },
                { label: "$250 - $1000", value: "250-1000" },
                { label: "$1000+", value: "1000-plus" }
              ]}
              value={priceBucket}
            />

            <Select
              label="Seller"
              onChange={(event) => setSellerId(event.target.value)}
              options={[
                { label: "All sellers", value: "" },
                ...sellerOptions.map((seller) => ({ label: seller.name, value: seller.id }))
              ]}
              value={sellerId}
            />

            <Select
              label="Rating"
              onChange={(event) => setRatingFilter(event.target.value as typeof ratingFilter)}
              options={[
                { label: "All ratings", value: "all" },
                { label: "4 stars & up", value: "4-up" },
                { label: "3 stars & up", value: "3-up" }
              ]}
              value={ratingFilter}
            />

            <label className="flex items-center gap-3 rounded-2xl bg-mist px-4 py-3 text-sm text-slate">
              <input
                checked={inStockOnly}
                className="h-4 w-4 accent-pine"
                onChange={(event) => setInStockOnly(event.target.checked)}
                type="checkbox"
              />
              <span>In stock only</span>
            </label>

            <Select
              label="Sort"
              onChange={(event) => setSort(event.target.value as typeof sort)}
              options={catalogSortOptions.map((option) => ({
                label: option.label,
                value: option.value
              }))}
              value={sort}
            />
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="rounded-[24px] bg-mist px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate">Access scope</p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {user ? `${user.name} · ${user.role}` : "Guest"}
              </p>
              <p className="mt-2 text-sm text-slate">
                {role === "seller"
                  ? "Marketplace purchase actions are hidden for seller accounts."
                  : role === "admin"
                    ? "This session is restricted to admin operations surfaces."
                    : "Sign in to unlock role-specific surfaces."}
              </p>
            </div>

            {isAuthenticated ? (
              <div className="flex flex-col gap-3">
                <Button onClick={logout} type="button" variant="secondary">
                  Logout
                </Button>
                <Button
                  onClick={() => {
                    navigate(getRoleDashboardPath(role));
                  }}
                  type="button"
                >
                  Open my dashboard
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <NavItem label="Login" path="/login" />
                <NavItem label="Register" path="/register" />
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
