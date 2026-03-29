import {
  Suspense,
  lazy,
  memo,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent
} from "react";
import { Link } from "react-router-dom";
import { useSession } from "../../lib/auth-context";
import { currencyFormatter, toAssetUrl } from "../../lib/api";
import type { Product } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { PanelSkeleton } from "../ui/PanelSkeleton";

export type ProductCardProps = {
  product: Product;
  style?: CSSProperties;
  busyAction?: string | null;
  onAddToCart?: (productId: string) => void;
};

const getVirtualRating = (product: Product): number => {
  const seed = product.id.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return 3 + (seed % 20) / 10;
};

const ProductQuickViewModal = lazy(async () => {
  const module = await import("../organisms/ProductQuickViewModal");
  return { default: module.ProductQuickViewModal };
});

function ProductCardComponent({ product, style, busyAction = null, onAddToCart }: ProductCardProps) {
  const { isAuthenticated, role } = useSession();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const rating = useMemo(() => getVirtualRating(product), [product]);
  const image = product.images[0] ? toAssetUrl(product.images[0]) : null;
  const isBusy = busyAction === `add-cart-${product.id}`;
  const canPurchase = role === "customer";
  const specs = useMemo(
    () => [
      { label: "Seller", value: product.sellerName },
      { label: "Category", value: product.categoryName },
      { label: "Price", value: currencyFormatter.format(product.price) },
      { label: "Stock", value: product.stock > 0 ? `${product.stock} units` : "Unavailable" }
    ],
    [product]
  );

  const handleCardKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsQuickViewOpen(true);
    }
  };

  return (
    <>
      <div className="p-2" style={style}>
        <article className="panel-surface group flex h-full flex-col overflow-hidden rounded-[24px] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(16,24,40,0.14)]">
          <button
            aria-controls={`quick-view-dialog-${product.id}`}
            aria-expanded={isQuickViewOpen}
            aria-haspopup="dialog"
            aria-label={`Open quick view for ${product.name}`}
            className="flex flex-1 flex-col text-left"
            onClick={() => setIsQuickViewOpen(true)}
            onKeyDown={handleCardKeyDown}
            type="button"
          >
            <div className="relative aspect-video overflow-hidden bg-mist">
              {image ? (
                <img
                  alt={product.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                  loading="lazy"
                  src={image}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate">
                  No image available
                </div>
              )}
              <span className="absolute left-3 top-3 rounded-full bg-white/88 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate">
                {product.categoryName}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className="font-display text-lg font-bold text-ink"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    {product.name}
                  </h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate">
                    by {product.sellerName}
                  </p>
                </div>
                <span className="shrink-0 text-lg font-bold text-ember">
                  {currencyFormatter.format(product.price)}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-slate">
                <span>{rating.toFixed(1)} / 5 rating</span>
                <span>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="info">COD enabled</Badge>
                <Badge variant="info">Quick view</Badge>
              </div>
            </div>
          </button>

          <div className="mt-auto flex items-center gap-3 p-4 pt-0">
            {image ? (
              <Link className="action-secondary flex-1" to={`/product/${product.id}`}>
                Full page
              </Link>
            ) : null}
            {onAddToCart ? (
              !isAuthenticated ? (
                <Link className="action-primary flex-1" to="/login">
                  Login to buy
                </Link>
              ) : (
                <Button
                  aria-label={`Add ${product.name} to cart`}
                  className="flex-1"
                  disabled={product.stock <= 0 || isBusy || !canPurchase}
                  onClick={(event) => {
                    event.preventDefault();
                    if (canPurchase) {
                      onAddToCart(product.id);
                    }
                  }}
                  type="button"
                >
                  {product.stock <= 0
                    ? "Out of stock"
                    : !canPurchase
                      ? "Customer only"
                      : isBusy
                        ? "Adding..."
                        : "Add to cart"}
                </Button>
              )
            ) : null}
          </div>
        </article>
      </div>
      <Suspense fallback={<PanelSkeleton className="hidden" lines={2} />}>
        <ProductQuickViewModal
          isBusy={isBusy}
          isOpen={isQuickViewOpen}
          onAddToCart={onAddToCart}
          onClose={() => setIsQuickViewOpen(false)}
          product={product}
          rating={rating}
          specs={specs}
        />
      </Suspense>
    </>
  );
}

export const ProductCard = memo(ProductCardComponent);
