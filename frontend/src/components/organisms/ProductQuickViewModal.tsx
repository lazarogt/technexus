import { memo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useSession } from "../../lib/auth-context";
import { currencyFormatter, toAssetUrl } from "../../lib/api";
import type { Product } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export type ProductQuickViewModalProps = {
  product: Product;
  isOpen: boolean;
  rating: number;
  specs: Array<{ label: string; value: string }>;
  isBusy?: boolean;
  onAddToCart?: (productId: string) => void;
  onClose: () => void;
};

const modalRoot = typeof document !== "undefined" ? document.body : null;

function ProductQuickViewModalComponent({
  product,
  isOpen,
  rating,
  specs,
  isBusy = false,
  onAddToCart,
  onClose
}: ProductQuickViewModalProps) {
  const { isAuthenticated, role } = useSession();
  const canPurchase = role === "customer";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !modalRoot) {
    return null;
  }

  const image = product.images[0] ? toAssetUrl(product.images[0]) : null;

  return createPortal(
    <div
      aria-describedby={`quick-view-description-${product.id}`}
      aria-labelledby={`quick-view-title-${product.id}`}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 transition-opacity duration-200 ease-out motion-reduce:transition-none"
      id={`quick-view-dialog-${product.id}`}
      role="dialog"
    >
      <button
        aria-label="Close quick view"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <div className="panel-surface relative z-10 grid max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[30px] bg-white transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="bg-mist">
          {image ? (
            <img
              alt={product.name}
              className="h-full max-h-[420px] w-full object-cover lg:max-h-[90vh]"
              src={image}
            />
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center text-sm text-slate">
              No image available
            </div>
          )}
        </div>

        <div className="flex max-h-[90vh] flex-col overflow-y-auto p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate">
                Quick view
              </p>
              <h2
                className="mt-3 font-display text-3xl font-bold text-ink"
                id={`quick-view-title-${product.id}`}
              >
                {product.name}
              </h2>
              <p className="mt-2 text-sm uppercase tracking-[0.16em] text-slate">
                Sold by {product.sellerName}
              </p>
            </div>
            <Button className="h-11 w-11 rounded-full px-0 text-xl" onClick={onClose} type="button" variant="secondary">
              ×
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Badge variant="info">{product.categoryName}</Badge>
            <Badge variant="info">{rating.toFixed(1)} / 5 rating</Badge>
            <Badge variant={product.stock > 0 ? "success" : "warning"}>
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </Badge>
          </div>

          <p className="mt-6 text-3xl font-bold text-ember">
            {currencyFormatter.format(product.price)}
          </p>

          <p className="mt-4 text-sm leading-7 text-slate" id={`quick-view-description-${product.id}`}>
            {product.description}
          </p>

          <section aria-label="Product specifications" className="mt-8">
            <h3 className="font-display text-lg font-bold text-ink">Specs</h3>
            <dl className="mt-4 grid gap-3">
              {specs.map((spec) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-2xl bg-mist px-4 py-3"
                  key={spec.label}
                >
                  <dt className="text-sm font-semibold text-slate">{spec.label}</dt>
                  <dd className="text-sm font-bold text-ink">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {onAddToCart ? (
              !isAuthenticated ? (
                <Link className="action-primary flex-1" onClick={onClose} to="/login">
                  Login to buy
                </Link>
              ) : (
                <Button
                  aria-label={`Add ${product.name} to cart from quick view`}
                  className="flex-1"
                  disabled={product.stock <= 0 || isBusy || !canPurchase}
                  onClick={() => {
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
            <Link
              aria-label={`Open full product page for ${product.name}`}
              className="action-secondary flex-1"
              onClick={onClose}
              to={`/product/${product.id}`}
            >
              Open full product page
            </Link>
          </div>
        </div>
      </div>
    </div>,
    modalRoot
  );
}

export const ProductQuickViewModal = memo(ProductQuickViewModalComponent);
