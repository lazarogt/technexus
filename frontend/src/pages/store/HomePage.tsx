import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductRail } from "@/components/store/ProductRail";
import { SectionHeader } from "@/components/store/SectionHeader";
import { HeroBanner } from "@/components/store/HeroBanner";
import { SellerSpotlightCard } from "@/components/store/SellerSpotlightCard";
import { TrustBar } from "@/components/store/TrustBar";
import { buildStorefrontCollections, getProductBadges, orderCategories } from "@/components/store/storefront-data";
import { ProductRailSkeleton } from "@/components/shared/ProductRailSkeleton";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { trackOnce } from "@/features/analytics/analytics";
import { useCart } from "@/features/cart/cart-context";
import { ES } from "@/i18n/es";

export function HomePage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { addItem } = useCart();
  const catalogQuery = useQuery({
    queryKey: ["home", "catalog"],
    queryFn: () => listProducts({ limit: 24 })
  });
  const categoriesQuery = useQuery({
    queryKey: ["home", "categories"],
    queryFn: listCategories
  });

  const products = catalogQuery.data?.products ?? [];
  const orderedCategories = useMemo(() => orderCategories(categoriesQuery.data?.categories ?? []), [categoriesQuery.data?.categories]);
  const collections = useMemo(() => buildStorefrontCollections(products), [products]);
  const spotlight = collections.trending[0] ?? products[0];
  const catalogProducts = useMemo(() => products.slice(0, 12), [products]);

  useEffect(() => {
    trackOnce(`view-home:${location.key}`, "view_home");
  }, [location.key]);

  return (
    <div className="store-page stack-xl">
      <HeroBanner
        spotlight={spotlight}
        categoryCount={orderedCategories.length}
        sellerCount={collections.topSellers.length}
      />

      <section className="store-support-strip">
        <div className="stack-sm">
          <SectionHeader
            eyebrow={t("home.supportEyebrow")}
            title={t("home.supportTitle")}
            description={t("home.supportDescription")}
          />
          <TrustBar />
        </div>
        <div className="store-category-grid">
          {orderedCategories.slice(0, 5).map((category) => (
            <Link key={category.id} to={`/category/${category.id}`} className="store-category-link">
              <strong>{category.name}</strong>
              <span>{ES.buttons.viewFeaturedProducts}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="stack-md">
        <SectionHeader
          title={t("home.trendingTitle")}
          description={t("home.trendingDescription")}
          action={<Link to="/products">{ES.buttons.viewAll}</Link>}
        />
        {catalogQuery.isLoading ? (
          <ProductRailSkeleton count={6} />
        ) : (
          <ProductRail>
            {collections.trending.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addItem}
                badges={getProductBadges(product, collections.badgeMap)}
                priorityImage={index < 2}
              />
            ))}
          </ProductRail>
        )}
      </section>

      <section className="stack-md">
        <SectionHeader
          title={t("home.dealsTitle")}
          description={t("home.dealsDescription")}
          action={<Link to="/products?sort=price-asc">{ES.buttons.viewOffers}</Link>}
        />
        {catalogQuery.isLoading ? (
          <ProductRailSkeleton count={6} />
        ) : (
          <ProductRail>
            {collections.deals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addItem}
                badges={getProductBadges(product, collections.badgeMap)}
              />
            ))}
          </ProductRail>
        )}
      </section>

      <section className="stack-md">
        <SectionHeader
          title={t("home.sellersTitle")}
          description={t("home.sellersDescription")}
        />
        <div className="seller-spotlight-grid">
          {collections.topSellers.map((seller) => (
            <SellerSpotlightCard key={seller.sellerId} seller={seller} />
          ))}
        </div>
      </section>

      <section className="stack-md">
        <SectionHeader
          title={t("home.catalogTitle")}
          description={t("home.catalogDescription")}
          action={<Link to="/products">{ES.buttons.openFullCatalog}</Link>}
        />
        {catalogQuery.isLoading ? (
          <ProductRailSkeleton count={8} />
        ) : (
          <div className="store-product-grid">
            {catalogProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addItem}
                badges={getProductBadges(product, collections.badgeMap)}
                priorityImage={index < 4}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
