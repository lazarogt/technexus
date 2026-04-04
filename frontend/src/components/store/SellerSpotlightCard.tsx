import { Link } from "react-router-dom";
import type { SellerSpotlight } from "@/components/store/storefront-data";
import { ProductRating } from "@/components/store/ProductRating";
import { formatCurrency } from "@/lib/format";

type SellerSpotlightCardProps = {
  seller: SellerSpotlight;
};

export function SellerSpotlightCard({ seller }: SellerSpotlightCardProps) {
  return (
    <article className="seller-spotlight-card">
      <img src={seller.heroProduct.images[0]} alt={seller.heroProduct.name} loading="lazy" />
      <div className="seller-spotlight-content">
        <p className="section-eyebrow">Top seller</p>
        <h3>{seller.sellerName}</h3>
        <ProductRating rating={seller.averageRating} count={seller.reviewCount} compact />
        <div className="seller-spotlight-meta">
          <span>{seller.productCount} productos activos</span>
          <span>Desde {formatCurrency(seller.startingPrice)}</span>
        </div>
        <Link to={`/product/${seller.heroProduct.id}`} className="seller-spotlight-link">
          Ver productos destacados
        </Link>
      </div>
    </article>
  );
}
