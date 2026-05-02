import { useQuery } from "@tanstack/react-query";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { PageSeo } from "@/components/seo/PageSeo";
import { Button } from "@/components/shared/Button";
import { ProductCard } from "@/components/store/ProductCard";
import { SectionHeader } from "@/components/store/SectionHeader";
import { buildStorefrontCollections, getProductBadges } from "@/components/store/storefront-data";
import { SearchBar } from "@/components/store/layout/SearchBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { StoreSkeletonCard } from "@/components/store/StoreSkeletonCard";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import type { Category } from "@/features/api/types";
import { DEMO_MODE } from "@/demo/demo-env";
import { DEMO_PRODUCTS } from "@/demo/demo-marketplace";
import { useCart } from "@/features/cart/cart-context";
import { ES } from "@/i18n/es";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeCategoryFilter(
  value: string,
  categories: Category[],
  categoriesLoaded: boolean
) {
  if (!value) {
    return "";
  }

  if (UUID_PATTERN.test(value)) {
    return value;
  }

  if (!categoriesLoaded) {
    return null;
  }

  const normalizedValue = value.trim().toLocaleLowerCase();
  const matchedCategory = categories.find(
    (category) => category.name.trim().toLocaleLowerCase() === normalizedValue
  );

  return matchedCategory?.id ?? "";
}

export function ProductsPage() {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const deferredSearch = useDeferredValue(searchParams.get("search") ?? "");
  const page = Number(searchParams.get("page") ?? 1);
  const sort = searchParams.get("sort") ?? "latest";
  const rawCategoryId = searchParams.get("categoryId") ?? "";
  const legacyCategory = searchParams.get("category") ?? "";

  const categoriesQuery = useQuery({
    queryKey: ["products", "categories"],
    queryFn: listCategories
  });
  const categories = useMemo(() => categoriesQuery.data?.categories ?? [], [categoriesQuery.data?.categories]);
  const categoryId = useMemo(
    () =>
      normalizeCategoryFilter(
        rawCategoryId || legacyCategory,
        categories,
        categoriesQuery.isSuccess || categoriesQuery.isError
      ),
    [rawCategoryId, legacyCategory, categories, categoriesQuery.isError, categoriesQuery.isSuccess]
  );

  useEffect(() => {
    if (categoryId === null) {
      return;
    }

    if (!rawCategoryId && !legacyCategory) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.delete("category");

    if (categoryId) {
      next.set("categoryId", categoryId);
    } else {
      next.delete("categoryId");
    }

    const currentParams = searchParams.toString();
    const nextParams = next.toString();

    if (currentParams !== nextParams) {
      setSearchParams(next, { replace: true });
    }
  }, [categoryId, legacyCategory, rawCategoryId, searchParams, setSearchParams]);

  const productsQuery = useQuery({
    queryKey: ["products", page, deferredSearch, sort, categoryId ?? "pending"],
    enabled: categoryId !== null,
    retry: false,
    queryFn: async () => {
      try {
        setStatus("loading");

        const response = await listProducts({
          page,
          limit: 12,
          search: deferredSearch,
          sort,
          categoryId: categoryId || undefined
        });

        setStatus("success");
        return response;
      } catch (error) {
        setStatus("error");
        throw error;
      }
    }
  });

  const fallbackProducts = useMemo(() => DEMO_PRODUCTS.slice(0, 12), []);
  const products = useMemo(() => {
    if (status === "error" && DEMO_MODE) {
      return fallbackProducts;
    }

    return productsQuery.data?.products ?? [];
  }, [fallbackProducts, productsQuery.data?.products, status]);
  const pagination = productsQuery.data?.pagination;
  const collections = useMemo(() => buildStorefrontCollections(products), [products]);
  const searchSuggestions = useMemo(
    () => categories.slice(0, 5).map((category) => category.name),
    [categories]
  );

  return (
    <div className="store-page stack-lg">
      <PageSeo
        title="Productos | TechNexus"
        description="Descubre el catalogo completo de TechNexus con filtros por categoria, precio y busqueda."
        canonicalPath="/products"
      />
      <SectionHeader
        eyebrow={t("productsPage.eyebrow")}
        title={t("productsPage.title")}
        description={t("productsPage.description")}
      />

      <div className="catalog-toolbar">
        <SearchBar
          className="catalog-search-surface"
          initialValue={searchParams.get("search") ?? ""}
          placeholder={ES.search.catalogPlaceholder}
          suggestions={searchSuggestions}
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
          <option value="latest">{t("productsPage.sortLatest")}</option>
          <option value="price-asc">{t("productsPage.sortPriceAsc")}</option>
          <option value="price-desc">{t("productsPage.sortPriceDesc")}</option>
          <option value="name-asc">{t("productsPage.sortNameAsc")}</option>
          <option value="name-desc">{t("productsPage.sortNameDesc")}</option>
        </select>
      </div>

      <div className="catalog-content-layout">
        <aside className="catalog-category-sidebar" aria-label={t("productsPage.allCategories")}>
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
            {t("productsPage.allCategories")}
          </button>
          {categories.map((category) => (
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
        </aside>

      <section>
      {status === "error" && !DEMO_MODE ? (
        <div className="empty-state products-error-state">
          <h3>{t("productsPage.errorTitle")}</h3>
          <p>{t("productsPage.errorDescription")}</p>
          <Button variant="secondary" onClick={() => void productsQuery.refetch()}>
            {t("buttons.retry")}
          </Button>
        </div>
      ) : productsQuery.isLoading || status === "loading" ? (
        <div className="store-product-grid">
          {Array.from({ length: 12 }, (_, index) => (
            <StoreSkeletonCard key={`skeleton-${index}`} />
          ))}
        </div>
      ) : products.length ? (
        <>
          {status === "error" && DEMO_MODE ? (
            <div className="empty-state products-error-state">
              <h3>{t("productsPage.errorTitle")}</h3>
              <p>{t("productsPage.errorDescription")}</p>
              <Button variant="secondary" onClick={() => void productsQuery.refetch()}>
                {t("buttons.retry")}
              </Button>
            </div>
          ) : null}
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
          {pagination && status !== "error" ? (
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
        <EmptyState title={t("productsPage.emptyTitle")} description={t("productsPage.emptyDescription")} />
      )}
      </section>
      </div>
    </div>
  );
}
