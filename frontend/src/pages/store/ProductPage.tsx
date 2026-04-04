import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { BadgePill } from "@/components/store/BadgePill";
import { BuyBox } from "@/components/store/BuyBox";
import { ImageGallery } from "@/components/store/ImageGallery";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductPageSkeleton } from "@/components/store/ProductPageSkeleton";
import { ProductRail } from "@/components/store/ProductRail";
import { ProductRating } from "@/components/store/ProductRating";
import { SectionHeader } from "@/components/store/SectionHeader";
import { TrustBar } from "@/components/store/TrustBar";
import {
  buildBadgeMap,
  getCustomersAlsoBought,
  getProductBadges,
  getRelatedProducts,
  getStoreBadgeLabel,
  getStoreBadgeTone
} from "@/components/store/storefront-data";
import { ProductRailSkeleton } from "@/components/shared/ProductRailSkeleton";
import { getProduct, listProducts } from "@/features/api/catalog-api";
import { trackOnce } from "@/features/analytics/analytics";
import { getStockLabel } from "@/features/catalog/product-display";
import { useCart } from "@/features/cart/cart-context";
import { ES } from "@/i18n/es";
import { formatCurrency } from "@/lib/format";

export function ProductPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const location = useLocation();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const productQuery = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id)
  });

  const relatedProductsQuery = useQuery({
    queryKey: ["product", id, "related", productQuery.data?.product.categoryId],
    enabled: Boolean(productQuery.data?.product.categoryId),
    queryFn: () =>
      listProducts({
        categoryId: productQuery.data?.product.categoryId,
        limit: 10
      })
  });

  const browseProductsQuery = useQuery({
    queryKey: ["product", id, "browse"],
    queryFn: () => listProducts({ limit: 18 })
  });

  const product = productQuery.data?.product;
  const stock = product ? getStockLabel(product.stock) : null;

  const productPool = useMemo(() => {
    const pool = new Map<string, NonNullable<typeof product>>();

    for (const candidate of relatedProductsQuery.data?.products ?? []) {
      pool.set(candidate.id, candidate);
    }

    for (const candidate of browseProductsQuery.data?.products ?? []) {
      pool.set(candidate.id, candidate);
    }

    if (product) {
      pool.delete(product.id);
    }

    return [...pool.values()];
  }, [browseProductsQuery.data?.products, product, relatedProductsQuery.data?.products]);

  const badgeMap = useMemo(() => buildBadgeMap(product ? [product, ...productPool] : productPool), [product, productPool]);
  const relatedProducts = useMemo(() => (product ? getRelatedProducts(product, productPool, 4) : []), [product, productPool]);
  const alsoBoughtProducts = useMemo(() => {
    if (!product) {
      return [];
    }

    const exclude = new Set(relatedProducts.map((candidate) => candidate.id));
    return getCustomersAlsoBought(product, productPool.filter((candidate) => !exclude.has(candidate.id)), 4);
  }, [product, productPool, relatedProducts]);

  useEffect(() => {
    if (!product) {
      return;
    }

    trackOnce(`view-product:${location.key}:${product.id}`, "view_product", {
      productId: product.id,
      categoryId: product.categoryId,
      sellerId: product.sellerId
    });
  }, [location.key, product]);

  if (productQuery.isLoading || !product) {
    return <ProductPageSkeleton />;
  }

  const handleAddToCart = () => addItem(product.id, quantity);
  const badges = getProductBadges(product, badgeMap);

  return (
    <div className="store-page stack-xl">
      <section className="store-product-detail">
        <ImageGallery images={product.images} productName={product.name} />
        <div className="store-product-summary stack-md">
          <div className="stack-sm">
            <p className="section-eyebrow">{product.categoryName}</p>
            {badges.length ? (
              <div className="store-product-badges">
                {badges.map((badge) => (
                  <BadgePill key={badge} tone={getStoreBadgeTone(badge)}>
                    {getStoreBadgeLabel(badge)}
                  </BadgePill>
                ))}
              </div>
            ) : null}
            <h1 className="product-title">{product.name}</h1>
            <ProductRating rating={product.averageRating} count={product.reviewCount} />
          </div>
          <p className="product-summary-price">{formatCurrency(product.price)}</p>
          <p className="product-description">{product.description}</p>
          <div className="product-highlight-band" data-testid="product-stock-highlight">
            <strong>{stock?.label}</strong>
            <span>{stock?.urgency}</span>
          </div>
          <div className="store-product-facts">
            <span>{ES.product.soldBy(product.sellerName)}</span>
            <span>{ES.product.trackingIncluded}</span>
            <span>{ES.product.secureInventory}</span>
          </div>
          <TrustBar />
        </div>
        <BuyBox
          product={product}
          quantity={quantity}
          onQuantityChange={(value) => setQuantity(Math.max(1, value))}
          onAddToCart={handleAddToCart}
        />
      </section>

      <section className="stack-md">
        <SectionHeader
          title={t("product.reviewsTitle")}
          description={
            product.reviewCount > 0
              ? t("product.reviewsSummary", {
                  rating: product.averageRating.toFixed(1),
                  count: product.reviewCount
                })
              : t("product.reviewsEmptySummary")
          }
        />
        {product.reviews && product.reviews.length > 0 ? (
          <div className="store-review-grid">
            {product.reviews.map((review) => (
              <article key={review.id} className="store-review-card">
                <div className="store-review-header">
                  <strong>{review.userName}</strong>
                  <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <ProductRating rating={review.rating} count={1} compact />
                <p>{review.comment}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="store-empty-panel">
            <strong>{ES.product.noReviews}</strong>
            <p>{ES.product.noReviewsDescription}</p>
          </div>
        )}
      </section>

      <section className="stack-md">
        <SectionHeader
          title={t("product.relatedTitle")}
          description={t("product.relatedDescription")}
        />
        {relatedProductsQuery.isLoading || browseProductsQuery.isLoading ? (
          <ProductRailSkeleton count={4} />
        ) : (
          <ProductRail>
            {relatedProducts.map((related) => (
              <ProductCard
                key={related.id}
                product={related}
                onAddToCart={addItem}
                badges={getProductBadges(related, badgeMap)}
              />
            ))}
          </ProductRail>
        )}
      </section>

      <section className="stack-md">
        <SectionHeader
          title={t("product.alsoBoughtTitle")}
          description={t("product.alsoBoughtDescription")}
        />
        {relatedProductsQuery.isLoading || browseProductsQuery.isLoading ? (
          <ProductRailSkeleton count={4} />
        ) : (
          <ProductRail>
            {alsoBoughtProducts.map((candidate) => (
              <ProductCard
                key={candidate.id}
                product={candidate}
                onAddToCart={addItem}
                badges={getProductBadges(candidate, badgeMap)}
              />
            ))}
          </ProductRail>
        )}
      </section>

      <div className="mobile-buybar" data-testid="mobile-buybar">
        <div className="stack-xs">
          <strong>{product.name}</strong>
          <small>{formatCurrency(product.price)}</small>
        </div>
        <button type="button" className="button button-primary" onClick={handleAddToCart} disabled={product.stock <= 0}>
          {t("buttons.addToCart")}
        </button>
      </div>
    </div>
  );
}
