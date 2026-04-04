import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import { ProductCard } from "@/components/store/ProductCard";
import { SectionHeader } from "@/components/store/SectionHeader";
import { buildStorefrontCollections, getProductBadges } from "@/components/store/storefront-data";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductRailSkeleton } from "@/components/shared/ProductRailSkeleton";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";
import { ES } from "@/i18n/es";

export function CategoryPage() {
  const { t } = useTranslation();
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

  const categoryName = categoriesQuery.data?.categories.find((category) => category.id === id)?.name ?? ES.labels.category;
  const collections = useMemo(() => buildStorefrontCollections(filteredProducts), [filteredProducts]);

  return (
    <div className="category-layout">
      <aside className="filter-sidebar">
        <SectionHeader title={ES.labels.filters} description={t("categoryPage.sidebarDescription")} />
        <label className="field">
          <span className="field-label">{ES.labels.sort}</span>
          <select
            className="field-input field-select"
            value={sort}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              next.set("sort", event.target.value);
              setSearchParams(next);
            }}
          >
            <option value="latest">{t("categoryPage.sortLatest")}</option>
            <option value="price-asc">{t("categoryPage.sortPriceAsc")}</option>
            <option value="price-desc">{t("categoryPage.sortPriceDesc")}</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">{ES.labels.minPrice}</span>
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
          <span className="field-label">{ES.labels.maxPrice}</span>
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
          eyebrow={t("labels.department")}
          title={categoryName}
          description={t("categoryPage.description", { count: filteredProducts.length })}
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
          <EmptyState title={t("categoryPage.emptyTitle")} description={t("categoryPage.emptyDescription")} />
        )}
      </div>
    </div>
  );
}
