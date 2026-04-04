import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { ProductRating } from "@/components/store/ProductRating";
import { BadgePill } from "@/components/store/BadgePill";
import { getStoreBadgeLabel, getStoreBadgeTone, type StoreBadge } from "@/components/store/storefront-data";
import type { Product } from "@/features/api/types";
import { getStockLabel } from "@/features/catalog/product-display";
import { ES } from "@/i18n/es";
import { formatCurrency } from "@/lib/format";

type ProductCardProps = {
  product: Product;
  onAddToCart?: (productId: string) => void;
  badges?: StoreBadge[];
  sellerLabel?: string;
  priorityImage?: boolean;
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";

export function ProductCard({
  product,
  onAddToCart,
  badges = [],
  sellerLabel,
  priorityImage = false
}: ProductCardProps) {
  const { t } = useTranslation();
  const stock = getStockLabel(product.stock);

  return (
    <article className="store-product-card" data-testid={`store-product-card-${product.id}`}>
      <Link to={`/product/${product.id}`} className="store-product-overlay" aria-label={t("product.viewAria", { productName: product.name })} />
      <Link to={`/product/${product.id}`} className="store-product-media-link" aria-label={product.name}>
        <div className="store-product-media">
          <img src={product.images[0] ?? FALLBACK_IMAGE} alt={product.name} loading={priorityImage ? "eager" : "lazy"} />
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
        <Link to={`/product/${product.id}`} className="store-product-title">
          {product.name}
        </Link>
        <ProductRating rating={product.averageRating} count={product.reviewCount} compact />
        <p className="store-product-price">{formatCurrency(product.price)}</p>
        <p className="store-product-seller">{sellerLabel ?? ES.product.soldBy(product.sellerName)}</p>
        <p className="store-product-urgency">{stock.urgency}</p>
        <div className="store-product-actions">
          <Button
            data-testid={`add-to-cart-${product.id}`}
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
