import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { currencyFormatter, toAssetUrl } from "../../lib/api";
import type { Product } from "../../lib/types";

type ProductCardProps = {
  product: Product;
  busyAction: string | null;
  onAddToCart: (productId: string) => void;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const useReducedMotionPreference = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
};

const getShippingLabel = (stock: number): string => {
  if (stock > 8) {
    return "Entrega en 24-48h";
  }

  if (stock > 0) {
    return "Entrega a coordinar";
  }

  return "Sin disponibilidad";
};

export function ProductCard({ product, busyAction, onAddToCart }: ProductCardProps) {
  const prefersReducedMotion = useReducedMotionPreference();
  const [tiltStyle, setTiltStyle] = useState({
    transform: "perspective(1400px) rotateX(0deg) rotateY(0deg) translateY(0px)"
  });

  const availabilityLabel = useMemo(() => getShippingLabel(product.stock), [product.stock]);
  const isBusy = busyAction === `add-cart-${product.id}`;

  const handlePointerMove = (event: MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = (event.clientX - bounds.left) / bounds.width;
    const pointerY = (event.clientY - bounds.top) / bounds.height;
    const rotateY = clamp((pointerX - 0.5) * 7, -3.5, 3.5);
    const rotateX = clamp((0.5 - pointerY) * 7, -3.5, 3.5);

    setTiltStyle({
      transform: `perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`
    });
  };

  const handlePointerLeave = () => {
    setTiltStyle({
      transform: "perspective(1400px) rotateX(0deg) rotateY(0deg) translateY(0px)"
    });
  };

  return (
    <article
      className="product-card product-card--amazon"
      onMouseLeave={handlePointerLeave}
      onMouseMove={handlePointerMove}
      style={tiltStyle}
    >
      <div className="product-card__media">
        {product.images[0] ? (
          <img alt={product.name} loading="lazy" src={toAssetUrl(product.images[0])} />
        ) : (
          <div className="product-card__placeholder">Sin imagen</div>
        )}
        <span className="product-card__category">{product.categoryName}</span>
      </div>

      <div className="product-card__content">
        <div className="product-card__eyebrow">
          <span className="product-card__shipping">{availabilityLabel}</span>
          <span className="product-card__seller">Vende {product.sellerName}</span>
        </div>

        <div className="product-card__topline">
          <h3>{product.name}</h3>
          <strong>{currencyFormatter.format(product.price)}</strong>
        </div>

        <p>{product.description}</p>

        <div className="product-card__meta">
          <span>Stock: {product.stock}</span>
          <span>Pago contra entrega</span>
        </div>

        <div className="product-card__actions">
          <button
            disabled={product.stock <= 0 || isBusy}
            onClick={() => onAddToCart(product.id)}
            type="button"
          >
            {product.stock <= 0 ? "Agotado" : isBusy ? "Agregando..." : "Agregar al carrito"}
          </button>
        </div>

        {product.images.length > 1 ? (
          <div className="product-card__thumbs">
            {product.images.slice(1, 4).map((imagePath) => (
              <img
                alt={`${product.name} detalle`}
                key={imagePath}
                loading="lazy"
                src={toAssetUrl(imagePath)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
