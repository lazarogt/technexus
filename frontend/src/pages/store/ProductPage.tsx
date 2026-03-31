import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { BuyBox } from "@/components/store/BuyBox";
import { ImageGallery } from "@/components/store/ImageGallery";
import { getProduct, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";

export function ProductPage() {
  const { id = "" } = useParams();
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

  if (!product) {
    return <div className="page-loader">Cargando producto...</div>;
  }

  return (
    <div className="store-page stack-xl">
      <section className="product-detail-layout">
        <ImageGallery images={product.images} productName={product.name} />
        <div className="stack-md">
          <p className="section-eyebrow">{product.categoryName}</p>
          <h1 className="product-title">{product.name}</h1>
          <p className="product-description">{product.description}</p>
          <div className="product-facts">
            <span>Vendedor: {product.sellerName}</span>
            <span>Entrega: Pago contra entrega</span>
            <span>Stock sincronizado: {product.stock}</span>
          </div>
        </div>
        <BuyBox
          product={product}
          quantity={quantity}
          onQuantityChange={(value) => setQuantity(Math.max(1, value))}
          onAddToCart={() => addItem(product.id, quantity)}
        />
      </section>

      <section className="stack-md">
        <SectionHeading title="También te puede interesar" description="Productos del mismo catálogo para aumentar conversión sin salir del flujo de compra." />
        <div className="product-grid">
          {(relatedProductsQuery.data?.products ?? [])
            .filter((related) => related.id !== product.id)
            .map((related) => (
              <ProductCard key={related.id} product={related} onAddToCart={addItem} />
            ))}
        </div>
      </section>
    </div>
  );
}
