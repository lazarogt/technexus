import { useQuery } from "@tanstack/react-query";
import { startTransition, useDeferredValue, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductCard } from "@/components/store/ProductCard";
import { SectionHeader } from "@/components/store/SectionHeader";
import { buildStorefrontCollections, getProductBadges } from "@/components/store/storefront-data";
import { SearchBar } from "@/components/store/layout/SearchBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { ProductRailSkeleton } from "@/components/shared/ProductRailSkeleton";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";

export function ProductsPage() {
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const deferredSearch = useDeferredValue(searchParams.get("search") ?? "");
  const page = Number(searchParams.get("page") ?? 1);
  const sort = searchParams.get("sort") ?? "latest";
  const categoryId = searchParams.get("categoryId") ?? "";

  const categoriesQuery = useQuery({
    queryKey: ["products", "categories"],
    queryFn: listCategories
  });

  const productsQuery = useQuery({
    queryKey: ["products", page, deferredSearch, sort, categoryId],
    queryFn: () =>
      listProducts({
        page,
        limit: 12,
        search: deferredSearch,
        sort,
        categoryId: categoryId || undefined
      })
  });

  const products = productsQuery.data?.products ?? [];
  const pagination = productsQuery.data?.pagination;
  const collections = useMemo(() => buildStorefrontCollections(products), [products]);

  return (
    <div className="store-page stack-lg">
      <SectionHeader
        eyebrow="Store catalog"
        title="Find products faster with search, sort and reusable storefront modules"
        description="This catalog keeps the dashboards untouched while tightening scan speed, product context and mobile browse behavior."
      />

      <div className="catalog-toolbar">
        <SearchBar
          compact
          className="catalog-search-surface"
          initialValue={searchParams.get("search") ?? ""}
          placeholder="Search by product, seller or use case"
          onSubmit={(value) => {
            startTransition(() => {
              const next = new URLSearchParams(searchParams);
              next.set("page", "1");
              if (value) {
                next.set("search", value);
              } else {
                next.delete("search");
              }
              setSearchParams(next);
            });
          }}
        />
        <select
          value={sort}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            next.set("sort", event.target.value);
            next.set("page", "1");
            setSearchParams(next);
          }}
        >
          <option value="latest">Newest arrivals</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
        </select>
      </div>

      <div className="chip-row">
        <button
          type="button"
          className={categoryId ? "chip" : "chip is-active"}
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.delete("categoryId");
            next.set("page", "1");
            setSearchParams(next);
          }}
        >
          All
        </button>
        {(categoriesQuery.data?.categories ?? []).map((category) => (
          <button
            key={category.id}
            type="button"
            className={categoryId === category.id ? "chip is-active" : "chip"}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set("categoryId", category.id);
              next.set("page", "1");
              setSearchParams(next);
            }}
          >
            {category.name}
          </button>
        ))}
      </div>

      {productsQuery.isLoading ? (
        <ProductRailSkeleton count={8} />
      ) : products.length ? (
        <>
          <div className="store-product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addItem}
                badges={getProductBadges(product, collections.badgeMap)}
              />
            ))}
          </div>
          {pagination ? (
            <Pagination
              pagination={pagination}
              onChange={(nextPage) => {
                const next = new URLSearchParams(searchParams);
                next.set("page", String(nextPage));
                setSearchParams(next);
              }}
            />
          ) : null}
        </>
      ) : (
        <EmptyState title="No products found" description="Adjust the search term, category or sorting to discover more products." />
      )}
    </div>
  );
}
