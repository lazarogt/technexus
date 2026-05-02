import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { STORE_BADGES } from "@/config/store";
import { ProductRating } from "@/components/store/ProductRating";
import { BadgePill } from "@/components/store/BadgePill";
import { getStoreBadgeLabel, getStoreBadgeTone, type StoreBadge } from "@/components/store/storefront-data";
import type { Product } from "@/features/api/types";
import { getStockLabel } from "@/features/catalog/product-display";
import { ES } from "@/i18n/es";
import { formatCurrency } from "@/lib/format";
import { applyImageFallback, DEFAULT_PRODUCT_IMAGE } from "@/lib/images";
import { buildProductPath } from "@/lib/storefront-routes";

type ProductCardProps = {
  product: Product;
  onAddToCart?: (productId: string) => void;
  badges?: StoreBadge[];
  sellerLabel?: string;
  priorityImage?: boolean;
};

export function ProductCard({
  product,
  onAddToCart,
  badges = [],
  sellerLabel,
  priorityImage = false
}: ProductCardProps) {
  const { t } = useTranslation();
  const stock = getStockLabel(product.stock);
  const productPath = buildProductPath(product);

  return (
    <article className="store-product-card product-card" data-testid="product-card" data-tour="product-card">
      <Link to={productPath} className="store-product-overlay" aria-label={t("product.viewAria", { productName: product.name })} />
      <Link to={productPath} className="store-product-media-link" aria-label={product.name}>
        <div className="store-product-media">
          <img
            src={product.images[0] ?? DEFAULT_PRODUCT_IMAGE}
            alt={product.name}
            loading={priorityImage ? "eager" : "lazy"}
            fetchPriority={priorityImage ? "high" : "auto"}
            decoding={priorityImage ? "sync" : "async"}
            onError={applyImageFallback}
          />
        </div>
      </Link>
      <div className="store-product-body">
        <div className="store-product-topline">
          <span className="store-product-category">{product.categoryName}</span>
          <span className={clsx("store-stock-chip", `is-${stock.tone}`)}>{stock.label}</span>
        </div>
        {badges.length ? (
          <div className="store-product-badges">
            {badges.map((badge) => (
              <BadgePill key={badge} tone={getStoreBadgeTone(badge)}>
                {getStoreBadgeLabel(badge)}
              </BadgePill>
            ))}
          </div>
        ) : null}
        <Link to={productPath} className="store-product-title">
          {product.name}
        </Link>
        <ProductRating rating={product.averageRating} count={product.reviewCount} compact />
        <p className="store-product-price">{formatCurrency(product.price)}</p>
        <p className="store-product-seller">{sellerLabel ?? ES.product.soldBy(product.sellerName)}</p>
        <p className="store-product-trust-badge">{STORE_BADGES.COD}</p>
        <p className="store-product-urgency">{stock.urgency}</p>
        <div className="store-product-actions">
          <Button
            data-testid="add-to-cart"
            data-tour="add-to-cart"
            className="store-product-cta"
            onClick={() => onAddToCart?.(product.id)}
            disabled={product.stock <= 0}
            fullWidth
          >
            {t("buttons.addToCart")}
          </Button>
        </div>
      </div>
    </article>
  );
}
