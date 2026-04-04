import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ProductCard } from "@/components/store/ProductCard";
import { SectionHeader } from "@/components/store/SectionHeader";
import { buildStorefrontCollections, getProductBadges } from "@/components/store/storefront-data";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductRailSkeleton } from "@/components/shared/ProductRailSkeleton";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";

export function CategoryPage() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();
  const sort = searchParams.get("sort") ?? "latest";
  const maxPrice = Number(searchParams.get("maxPrice") ?? 0);
  const minPrice = Number(searchParams.get("minPrice") ?? 0);

  const categoriesQuery = useQuery({
    queryKey: ["category", "meta"],
    queryFn: listCategories
  });

  const productsQuery = useQuery({
    queryKey: ["category", id, sort],
    queryFn: () => listProducts({ categoryId: id, sort, limit: 24 })
  });

  const filteredProducts = useMemo(() => {
    return (productsQuery.data?.products ?? []).filter((product) => {
      if (minPrice > 0 && product.price < minPrice) {
        return false;
      }

      if (maxPrice > 0 && product.price > maxPrice) {
        return false;
      }

      return true;
    });
  }, [maxPrice, minPrice, productsQuery.data?.products]);

  const categoryName = categoriesQuery.data?.categories.find((category) => category.id === id)?.name ?? "Category";
  const collections = useMemo(() => buildStorefrontCollections(filteredProducts), [filteredProducts]);

  return (
    <div className="category-layout">
      <aside className="filter-sidebar">
        <SectionHeader title="Filters" description="Narrow the assortment without leaving the public storefront." />
        <label className="field">
          <span className="field-label">Sort</span>
          <select
            className="field-input field-select"
            value={sort}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              next.set("sort", event.target.value);
              setSearchParams(next);
            }}
          >
            <option value="latest">Newest</option>
            <option value="price-asc">Lowest price</option>
            <option value="price-desc">Highest price</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Min price</span>
          <input
            className="field-input"
            type="number"
            min={0}
            value={minPrice || ""}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value) {
                next.set("minPrice", event.target.value);
              } else {
                next.delete("minPrice");
              }
              setSearchParams(next);
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">Max price</span>
          <input
            className="field-input"
            type="number"
            min={0}
            value={maxPrice || ""}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value) {
                next.set("maxPrice", event.target.value);
              } else {
                next.delete("maxPrice");
              }
              setSearchParams(next);
            }}
          />
        </label>
      </aside>
      <div className="stack-lg">
        <SectionHeader
          eyebrow="Department"
          title={categoryName}
          description={`Showing ${filteredProducts.length} products with storefront filters that stay separate from dashboard management views.`}
        />
        {productsQuery.isLoading ? (
          <ProductRailSkeleton count={8} />
        ) : filteredProducts.length ? (
          <div className="store-product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addItem}
                badges={getProductBadges(product, collections.badgeMap)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No products match these filters" description="Try a different price range or sorting option." />
        )}
      </div>
    </div>
  );
}
