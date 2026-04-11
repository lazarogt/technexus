import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { STORE_BADGES } from "@/config/store";
import type { Product } from "@/features/api/types";
import { getPromoBadge, getStockLabel } from "@/features/catalog/product-display";
import { formatCurrency } from "@/lib/format";
import { applyImageFallback, DEFAULT_PRODUCT_IMAGE } from "@/lib/images";
import { buildProductPath } from "@/lib/storefront-routes";

type ProductCardProps = {
  product: Product;
  onAddToCart?: (productId: string) => void;
  badge?: string;
};

export function ProductCard({ product, onAddToCart, badge }: ProductCardProps) {
  const { t } = useTranslation();
  const stock = getStockLabel(product.stock);
  const promoBadge = getPromoBadge(badge);
  const productPath = buildProductPath(product);

  return (
    <article className="product-card" data-testid={`product-card-${product.id}`}>
      <Link to={productPath} className="product-card-overlay-link" aria-label={t("product.viewAria", { productName: product.name })} />
      <Link to={productPath} className="product-card-image-link" aria-label={product.name}>
        <img
          className="product-card-image"
          src={product.images[0] ?? DEFAULT_PRODUCT_IMAGE}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onError={applyImageFallback}
        />
        <div className="product-card-flags">
          {promoBadge ? <span className="product-badge">{promoBadge}</span> : null}
          <span className={`product-stock-pill is-${stock.tone}`}>{stock.label}</span>
        </div>
      </Link>
      <div className="product-card-body">
        <p className="product-card-category">{product.categoryName}</p>
        <Link to={productPath} className="product-card-title">
          {product.name}
        </Link>
        <div className="product-card-pricing">
          <p className="product-card-price">{formatCurrency(product.price)}</p>
          {promoBadge ? <small className="product-card-saving">{t("product.offerActive")}</small> : null}
        </div>
        <p className="product-card-meta">{stock.urgency}</p>
        <div className="product-card-trust">
          <span>{STORE_BADGES.COD}</span>
          <span>{t("product.satisfactionGuarantee")}</span>
        </div>
        <div className="product-card-actions">
          <Button
            data-testid={`add-to-cart-${product.id}`}
            className="product-card-cta"
            onClick={() => onAddToCart?.(product.id)}
            disabled={product.stock <= 0}
            fullWidth
          >
            {t("buttons.addToCart")}
          </Button>
          <Link to={productPath} className="product-card-secondary-action">
            {t("buttons.viewDetail")}
          </Link>
        </div>
      </div>
    </article>
  );
}
