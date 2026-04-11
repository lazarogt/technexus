import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { SellerSpotlight } from "@/components/store/storefront-data";
import { ProductRating } from "@/components/store/ProductRating";
import { ES } from "@/i18n/es";
import { formatCurrency } from "@/lib/format";
import { applyImageFallback, DEFAULT_PRODUCT_IMAGE } from "@/lib/images";
import { buildProductPath } from "@/lib/storefront-routes";

type SellerSpotlightCardProps = {
  seller: SellerSpotlight;
};

export function SellerSpotlightCard({ seller }: SellerSpotlightCardProps) {
  const { t } = useTranslation();

  return (
    <article className="seller-spotlight-card">
      <img
        src={seller.heroProduct.images[0] ?? DEFAULT_PRODUCT_IMAGE}
        alt={seller.heroProduct.name}
        loading="lazy"
        decoding="async"
        onError={applyImageFallback}
      />
      <div className="seller-spotlight-content">
        <p className="section-eyebrow">{t("home.sellersTitle")}</p>
        <h3>{seller.sellerName}</h3>
        <ProductRating rating={seller.averageRating} count={seller.reviewCount} compact />
        <div className="seller-spotlight-meta">
          <span>{t("dashboard.productManagement.productCountTitle", { count: seller.productCount })}</span>
          <span>{t("labels.price")} {formatCurrency(seller.startingPrice)}</span>
        </div>
        <Link to={buildProductPath(seller.heroProduct)} className="seller-spotlight-link">
          {ES.buttons.viewFeaturedProducts}
        </Link>
      </div>
    </article>
  );
}
