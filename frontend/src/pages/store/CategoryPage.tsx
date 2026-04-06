import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageSeo } from "@/components/seo/PageSeo";
import { ProductCard } from "@/components/store/ProductCard";
import { SectionHeader } from "@/components/store/SectionHeader";
import { buildStorefrontCollections, getProductBadges } from "@/components/store/storefront-data";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductRailSkeleton } from "@/components/shared/ProductRailSkeleton";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";
import { ES } from "@/i18n/es";
import { buildCategoryPath, extractStorefrontEntityId } from "@/lib/storefront-routes";

export function CategoryPage() {
  const { t } = useTranslation();
  const { categoryParam = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();
  const categoryId = extractStorefrontEntityId(categoryParam);
  const sort = searchParams.get("sort") ?? "latest";
  const maxPrice = Number(searchParams.get("maxPrice") ?? 0);
  const minPrice = Number(searchParams.get("minPrice") ?? 0);

  const categoriesQuery = useQuery({
    queryKey: ["category", "meta"],
    queryFn: listCategories
  });

  const productsQuery = useQuery({
    queryKey: ["category", categoryId, sort],
    queryFn: () => listProducts({ categoryId, sort, limit: 24 })
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

  const category = categoriesQuery.data?.categories.find((entry) => entry.id === categoryId);
  const categoryName = category?.name ?? ES.labels.category;
  const collections = useMemo(() => buildStorefrontCollections(filteredProducts), [filteredProducts]);

  useEffect(() => {
    if (!category) {
      return;
    }

    const canonicalPath = buildCategoryPath(category);

    if (location.pathname !== canonicalPath) {
      navigate(
        {
          pathname: canonicalPath,
          search: location.search,
          hash: location.hash
        },
        { replace: true }
      );
    }
  }, [category, location.hash, location.pathname, location.search, navigate]);

  return (
    <div className="category-layout">
      <PageSeo
        title={`${categoryName} | TechNexus`}
        description={`Explora ${categoryName.toLowerCase()} y encuentra productos destacados disponibles en TechNexus.`}
        canonicalPath={category ? buildCategoryPath(category) : "/products"}
      />
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
