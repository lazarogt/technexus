import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
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

export function HomePage() {
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
            eyebrow="Why shoppers convert here"
            title="Conversion-focused browsing with real seller context"
            description="Search remains visible, pricing is easy to scan, and each product carries rating, stock and seller signals without mixing in dashboard UI."
          />
          <TrustBar />
        </div>
        <div className="store-category-grid">
          {orderedCategories.slice(0, 5).map((category) => (
            <Link key={category.id} to={`/category/${category.id}`} className="store-category-link">
              <strong>{category.name}</strong>
              <span>Explore best picks</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="stack-md">
        <SectionHeader
          title="Trending Products"
          description="High-interest items surfaced from the live catalog using rating, review and availability signals."
          action={<Link to="/products">See all</Link>}
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
          title="Deals Worth Acting On"
          description="Price-sensitive picks that still keep review quality and seller confidence front and center."
          action={<Link to="/products?sort=price-asc">Browse deals</Link>}
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
          title="Top Sellers"
          description="Seller spotlights are derived from catalog depth and customer feedback so shoppers can compare stores quickly."
        />
        <div className="seller-spotlight-grid">
          {collections.topSellers.map((seller) => (
            <SellerSpotlightCard key={seller.sellerId} seller={seller} />
          ))}
        </div>
      </section>

      <section className="stack-md">
        <SectionHeader
          title="Shop the Full Catalog"
          description="Information-dense cards optimized for scan speed on desktop and touch-first browsing on mobile."
          action={<Link to="/products">Open full catalog</Link>}
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
