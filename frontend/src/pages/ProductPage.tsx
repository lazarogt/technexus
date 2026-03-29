import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PanelSkeleton } from "../components/ui/PanelSkeleton";
import { useAddToCart } from "../hooks/useCart";
import { useProduct } from "../hooks/useProduct";
import { useSession } from "../lib/auth-context";
import { currencyFormatter, toAssetUrl } from "../lib/api";

export default function ProductPage() {
  const { id = "" } = useParams();
  const { token, isAuthenticated, role } = useSession();
  const productQuery = useProduct(id);
  const addToCartMutation = useAddToCart(token);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const product = productQuery.data?.product;
  const rating = useMemo(() => {
    if (!product) {
      return 0;
    }

    const seed = product.id.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
    return 3 + (seed % 20) / 10;
  }, [product]);

  const activeImage = product?.images[activeImageIndex] ?? product?.images[0] ?? null;

  const handleAddToCart = async () => {
    if (!product) {
      return;
    }

    if (role !== "customer") {
      return;
    }

    await addToCartMutation.mutateAsync({ productId: product.id, quantity: 1 });
  };

  if (productQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PanelSkeleton lines={4} />
        <PanelSkeleton lines={8} />
      </div>
    );
  }

  if (productQuery.isError || !product) {
    return (
      <Card className="text-center" title="Product unavailable">
        <p className="mt-3 text-sm leading-7 text-slate">
          {productQuery.error instanceof Error
            ? productQuery.error.message
            : "The requested product could not be loaded."}
        </p>
        <Link className="action-primary mt-6" to="/">
          Back to marketplace
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate">
        <Link className="font-semibold text-ink" to="/">
          Home
        </Link>
        <span>/</span>
        <span className="max-w-[220px] truncate sm:max-w-none">{product.name}</span>
      </nav>

      <section className="panel-surface overflow-hidden p-5 sm:p-6 lg:p-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[28px] bg-mist">
              {activeImage ? (
                <img
                  alt={product.name}
                  className="aspect-video w-full object-cover"
                  src={toAssetUrl(activeImage)}
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-sm text-slate">
                  No product image available
                </div>
              )}
            </div>

            {product.images.length > 1 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {product.images.map((imagePath, index) => (
                  <button
                    aria-label={`Preview image ${index + 1} for ${product.name}`}
                    className={`overflow-hidden rounded-[20px] border ${
                      activeImageIndex === index ? "border-pine" : "border-transparent"
                    } bg-mist`}
                    key={imagePath}
                    onClick={() => setActiveImageIndex(index)}
                    type="button"
                  >
                    <img
                      alt={`${product.name} preview ${index + 1}`}
                      className="aspect-video w-full object-cover"
                      src={toAssetUrl(imagePath)}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{product.categoryName}</Badge>
              <Badge variant="info">{rating.toFixed(1)} / 5 rating</Badge>
              <Badge variant={product.stock > 0 ? "success" : "warning"}>
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </Badge>
            </div>

            <h1 className="mt-5 font-display text-4xl font-bold leading-none text-ink sm:text-5xl">
              {product.name}
            </h1>

            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-slate">
              Sold by {product.sellerName}
            </p>

            <p className="mt-5 text-3xl font-bold text-ember">
              {currencyFormatter.format(product.price)}
            </p>

            <p className="mt-5 text-sm leading-8 text-slate">{product.description}</p>

            <dl className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-mist p-4">
                <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate">Seller</dt>
                <dd className="mt-2 text-sm font-semibold text-ink">{product.sellerName}</dd>
              </div>
              <div className="rounded-[22px] bg-mist p-4">
                <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate">Category</dt>
                <dd className="mt-2 text-sm font-semibold text-ink">{product.categoryName}</dd>
              </div>
              <div className="rounded-[22px] bg-mist p-4">
                <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate">Payment</dt>
                <dd className="mt-2 text-sm font-semibold text-ink">Cash on delivery</dd>
              </div>
              <div className="rounded-[22px] bg-mist p-4">
                <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate">Availability</dt>
                <dd className="mt-2 text-sm font-semibold text-ink">
                  {product.stock > 0 ? "Ready to add to cart" : "Currently unavailable"}
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {!isAuthenticated ? (
                <Link className="action-primary flex-1" to="/login">
                  Login to buy
                </Link>
              ) : (
                <Button
                  className="flex-1"
                  disabled={product.stock <= 0 || addToCartMutation.isPending || role !== "customer"}
                  onClick={() => void handleAddToCart()}
                  type="button"
                >
                  {product.stock <= 0
                    ? "Out of stock"
                    : role !== "customer"
                      ? "Customer only"
                      : addToCartMutation.isPending
                        ? "Adding..."
                        : "Add to cart"}
                </Button>
              )}
              {role === "customer" ? (
                <Link className="action-secondary flex-1" to="/checkout">
                  Go to checkout
                </Link>
              ) : (
                <Link className="action-secondary flex-1" to="/">
                  Back to marketplace
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
