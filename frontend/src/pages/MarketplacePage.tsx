import { startTransition } from "react";
import { Link } from "react-router-dom";
import { CatalogSkeleton } from "../components/catalog/CatalogSkeleton";
import { ProductList } from "../components/organisms/ProductList";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAddToCart } from "../hooks/useCart";
import { useProducts } from "../hooks/useProducts";
import { useSession } from "../lib/auth-context";
import { useMarketplaceFilters } from "../lib/marketplace-context";

export default function MarketplacePage() {
  const { token, role } = useSession();
  const addToCartMutation = useAddToCart(token);
  const { products, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, totalProducts } =
    useProducts();
  const { searchQuery, categoryId, inStockOnly, sellerId, ratingFilter } = useMarketplaceFilters();

  const busyAction =
    addToCartMutation.isPending && addToCartMutation.variables
      ? `add-cart-${addToCartMutation.variables.productId}`
      : null;

  const handleAddToCart = async (productId: string) => {
    if (role !== "customer") {
      return;
    }

    await addToCartMutation.mutateAsync({ productId, quantity: 1 });

    startTransition(() => {
      void 0;
    });
  };

  const activeFilters = [
    searchQuery ? `Search: ${searchQuery}` : null,
    categoryId ? "Category filter active" : null,
    sellerId ? "Seller filter active" : null,
    ratingFilter !== "all" ? `Rating: ${ratingFilter}` : null,
    inStockOnly ? "In stock only" : null
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate">
        <Link className="font-semibold text-ink" to="/">
          Home
        </Link>
        <span>/</span>
        <span>Marketplace</span>
      </nav>

      <section className="panel-surface overflow-hidden bg-ink px-6 py-8 text-white sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div>
            <span className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/70">
              Marketplace
            </span>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-none sm:text-5xl">
              Browse TechNexus products in an Amazon-style catalog shell.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              Search from the header, refine from the filter rail and explore a virtualized grid
              backed by live API pagination.
            </p>
            <p className="mt-4 max-w-2xl text-xs font-semibold uppercase tracking-[0.18em] text-white/54">
              {role === "customer"
                ? "Cart and checkout are enabled for this session."
                : role
                  ? `Purchase actions are hidden for ${role} accounts.`
                  : "Guests can browse freely and must sign in to buy."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Loaded</p>
              <p className="mt-2 text-2xl font-bold text-white">{products.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Total catalog</p>
              <p className="mt-2 text-2xl font-bold text-white">{totalProducts}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Virtualized</p>
              <p className="mt-2 text-sm font-semibold text-white">react-window grid</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Loading model</p>
              <p className="mt-2 text-sm font-semibold text-white">Infinite query</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <article className="panel-surface p-6">
          <h2 className="font-display text-2xl font-bold text-ink">Product listing</h2>
          <p className="mt-2 text-sm leading-7 text-slate">
            The grid is responsive, virtualized and connected to `/products` with query params for
            search, category, sort and pagination.
          </p>
          {activeFilters.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <span
                  className="rounded-full bg-mist px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink"
                  key={filter}
                >
                  {filter}
                </span>
              ))}
            </div>
          ) : null}
        </article>
        <aside className="panel-surface p-6">
          <h3 className="font-display text-xl font-bold text-ink">State</h3>
          <div className="mt-4 space-y-3 text-sm text-slate">
            <p>{isLoading ? "Fetching catalog..." : "Catalog hydrated from API."}</p>
            <p>{hasNextPage ? "More pages available." : "Reached the current end of the list."}</p>
            <p>Extra seller, rating and stock filters are applied client-side.</p>
          </div>
        </aside>
      </section>

      {isError ? (
        <Card title="Catalog error">
          <p className="text-sm font-semibold text-red-600">
            {error instanceof Error ? error.message : "Unable to fetch products."}
          </p>
        </Card>
      ) : null}

      {isLoading ? (
        <CatalogSkeleton count={9} />
      ) : products.length > 0 ? (
        <ProductList
          busyAction={busyAction}
          hasNextPage={Boolean(hasNextPage)}
          isFetchingNextPage={isFetchingNextPage}
          onAddToCart={handleAddToCart}
          onLoadMore={() => void fetchNextPage()}
          products={products}
        />
      ) : (
        <Card className="text-center" title="No products matched">
          <p className="mt-3 text-sm leading-7 text-slate">
            Try broadening the search or resetting seller, rating and stock filters.
          </p>
          <div className="mt-6">
            <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} variant="secondary">
              Review filters
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
