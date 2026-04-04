import { Star } from "lucide-react";

type ProductRatingProps = {
  rating: number;
  count: number;
  compact?: boolean;
};

export function ProductRating({ rating, count, compact = false }: ProductRatingProps) {
  const label = count > 0 ? `${rating.toFixed(1)} · ${count} reseñas` : "Sin reseñas";

  return (
    <div className={compact ? "product-rating is-compact" : "product-rating"} aria-label={label}>
      <div className="product-rating-stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => {
          const filled = rating >= index + 0.8 || (count === 0 && index === 0);
          return <Star key={index} size={compact ? 14 : 16} className={filled ? "is-filled" : ""} />;
        })}
      </div>
      <span>{count > 0 ? rating.toFixed(1) : "Nuevo"}</span>
      <small>{count > 0 ? `(${count})` : "Sé el primero en comprarlo"}</small>
    </div>
  );
}
