import { Link } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import type { Product } from "@/features/api/types";
import { formatCurrency } from "@/lib/format";

type ProductCardProps = {
  product: Product;
  onAddToCart?: (productId: string) => void;
  badge?: string;
};

export function ProductCard({ product, onAddToCart, badge }: ProductCardProps) {
  return (
    <article className="product-card" data-testid={`product-card-${product.id}`}>
      <Link to={`/product/${product.id}`} className="product-card-image-link" aria-label={product.name}>
        <img
          className="product-card-image"
          src={product.images[0] ?? "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80"}
          alt={product.name}
          loading="lazy"
        />
        {badge ? <span className="product-badge">{badge}</span> : null}
      </Link>
      <div className="product-card-body">
        <p className="product-card-category">{product.categoryName}</p>
        <Link to={`/product/${product.id}`} className="product-card-title">
          {product.name}
        </Link>
        <p className="product-card-price">{formatCurrency(product.price)}</p>
        <p className="product-card-meta">{product.stock > 0 ? `${product.stock} disponibles` : "Sin stock"}</p>
        <Button
          data-testid={`add-to-cart-${product.id}`}
          onClick={() => onAddToCart?.(product.id)}
          disabled={product.stock <= 0}
          fullWidth
        >
          Agregar al carrito
        </Button>
      </div>
    </article>
  );
}
