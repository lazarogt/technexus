import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductRailSkeleton } from "@/components/shared/ProductRailSkeleton";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { BuyBox } from "@/components/store/BuyBox";
import { ImageGallery } from "@/components/store/ImageGallery";
import { ProductPageSkeleton } from "@/components/store/ProductPageSkeleton";
import { TrustBar } from "@/components/store/TrustBar";
import { getProduct, listProducts } from "@/features/api/catalog-api";
import { trackOnce } from "@/features/analytics/analytics";
import { getStockLabel } from "@/features/catalog/product-display";
import { useCart } from "@/features/cart/cart-context";

export function ProductPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const productQuery = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id)
  });

  const relatedProductsQuery = useQuery({
    queryKey: ["product", id, "related", productQuery.data?.product.categoryId],
    enabled: Boolean(productQuery.data?.product.categoryId),
    queryFn: () =>
      listProducts({
        categoryId: productQuery.data?.product.categoryId,
        limit: 4
      })
  });

  const product = productQuery.data?.product;
  const stock = product ? getStockLabel(product.stock) : null;

  useEffect(() => {
    if (!product) {
      return;
    }

    trackOnce(`view-product:${location.key}:${product.id}`, "view_product", {
      productId: product.id,
      categoryId: product.categoryId,
      sellerId: product.sellerId
    });
  }, [location.key, product]);

  if (productQuery.isLoading || !product) {
    return <ProductPageSkeleton />;
  }

  const handleAddToCart = () => addItem(product.id, quantity);

  return (
    <div className="store-page stack-xl">
      <section className="product-detail-layout">
        <ImageGallery images={product.images} productName={product.name} />
        <div className="stack-md">
          <p className="section-eyebrow">{product.categoryName}</p>
          <h1 className="product-title">{product.name}</h1>
          <p className="product-description">{product.description}</p>
          <div className="product-highlight-band">
            <strong>{stock?.label}</strong>
            <span>{stock?.urgency}</span>
          </div>
          <TrustBar />
          <div className="product-facts">
            <span>Vendedor: {product.sellerName}</span>
            <span>Entrega: entre manana y 48 horas habiles</span>
            <span>Compra segura con pago contra entrega</span>
          </div>
        </div>
        <BuyBox
          product={product}
          quantity={quantity}
          onQuantityChange={(value) => setQuantity(Math.max(1, value))}
          onAddToCart={handleAddToCart}
        />
      </section>

      <section className="stack-md">
        <SectionHeading title="También te puede interesar" description="Productos del mismo catálogo para aumentar conversión sin salir del flujo de compra." />
        {relatedProductsQuery.isLoading ? (
          <ProductRailSkeleton />
        ) : (
          <div className="product-rail">
            {(relatedProductsQuery.data?.products ?? [])
              .filter((related) => related.id !== product.id)
              .map((related) => (
                <ProductCard key={related.id} product={related} onAddToCart={addItem} />
              ))}
          </div>
        )}
      </section>
      <div className="mobile-buybar">
        <div className="stack-xs">
          <strong>{product.name}</strong>
          <small>{stock?.label}</small>
        </div>
        <button type="button" className="button button-primary" onClick={handleAddToCart} disabled={product.stock <= 0}>
          Agregar al carrito
        </button>
      </div>
    </div>
  );
}
