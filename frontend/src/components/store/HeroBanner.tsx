import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { TrustBar } from "@/components/store/TrustBar";
import type { Product } from "@/features/api/types";
import { formatCurrency } from "@/lib/format";

type HeroBannerProps = {
  spotlight?: Product;
  categoryCount: number;
  sellerCount: number;
};

export function HeroBanner({ spotlight, categoryCount, sellerCount }: HeroBannerProps) {
  return (
    <section className="hero-banner">
      <div className="hero-copy">
        <p className="section-eyebrow">Tech marketplace</p>
        <h1>Find the next device faster with search-first shopping and dense product context.</h1>
        <p>
          Browse laptops, gaming gear and components with live pricing, seller credibility and
          purchase-ready product detail pages built to reduce friction.
        </p>
        <div className="hero-stat-row">
          <div className="hero-stat">
            <strong>{categoryCount}+</strong>
            <span>active departments</span>
          </div>
          <div className="hero-stat">
            <strong>{sellerCount}</strong>
            <span>top sellers featured</span>
          </div>
        </div>
        <TrustBar />
        <div className="hero-actions">
          <Link to="/products" className="hero-primary">
            Shop Now
          </Link>
          <Link to="/products?sort=price-asc" className="hero-secondary">
            Explore Deals
          </Link>
        </div>
      </div>
      <div className="hero-spotlight">
        {spotlight ? (
          <>
            <img src={spotlight.images[0]} alt={spotlight.name} loading="lazy" />
            <div className="hero-spotlight-card">
              <span>Trending now</span>
              <strong>{spotlight.name}</strong>
              <p>{spotlight.categoryName} · {spotlight.sellerName}</p>
              <div>
                <b>{formatCurrency(spotlight.price)}</b>
                <Link to={`/product/${spotlight.id}`}>
                  View details <ArrowRight size={16} />
                </Link>
              </div>
              <small>High-visibility placement, rating signals and faster path to checkout.</small>
            </div>
          </>
        ) : (
          <div className="hero-placeholder">
            <strong>Catalog loading</strong>
            <p>Home merchandising is derived from the public product feed without API changes.</p>
          </div>
        )}
      </div>
    </section>
  );
}
