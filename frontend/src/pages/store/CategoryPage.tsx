import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ProductCard } from "@/components/catalog/ProductCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductRailSkeleton } from "@/components/shared/ProductRailSkeleton";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";

export function CategoryPage() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();
  const sort = searchParams.get("sort") ?? "latest";
  const maxPrice = Number(searchParams.get("maxPrice") ?? 0);
  const minPrice = Number(searchParams.get("minPrice") ?? 0);

  const categoriesQuery = useQuery({
    queryKey: ["category", "meta"],
    queryFn: listCategories
  });

  const productsQuery = useQuery({
    queryKey: ["category", id, sort],
    queryFn: () => listProducts({ categoryId: id, sort, limit: 24 })
  });

  const filteredProducts = useMemo(() => {
    return (productsQuery.data?.products ?? []).filter((product) => {
      if (minPrice > 0 && product.price < minPrice) {
        return false;
      }

      if (maxPrice > 0 && product.price > maxPrice) {
        return false;
      }

      return true;
    });
  }, [maxPrice, minPrice, productsQuery.data?.products]);

  const categoryName =
    categoriesQuery.data?.categories.find((category) => category.id === id)?.name ?? "Categoría";

  return (
    <div className="category-layout">
      <aside className="filter-sidebar">
        <SectionHeading title="Filtros" description="Ajustes rápidos sin mezclar la navegación pública con paneles internos." />
        <label className="field">
          <span className="field-label">Ordenar</span>
          <select
            className="field-input field-select"
            value={sort}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              next.set("sort", event.target.value);
              setSearchParams(next);
            }}
          >
            <option value="latest">Más recientes</option>
            <option value="price-asc">Precio menor</option>
            <option value="price-desc">Precio mayor</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Precio mínimo</span>
          <input
            className="field-input"
            type="number"
            min={0}
            value={minPrice || ""}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value) {
                next.set("minPrice", event.target.value);
              } else {
                next.delete("minPrice");
              }
              setSearchParams(next);
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">Precio máximo</span>
          <input
            className="field-input"
            type="number"
            min={0}
            value={maxPrice || ""}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value) {
                next.set("maxPrice", event.target.value);
              } else {
                next.delete("maxPrice");
              }
              setSearchParams(next);
            }}
          />
        </label>
      </aside>
      <div className="stack-lg">
        <SectionHeading
          eyebrow="Categoría"
          title={categoryName}
          description={`Mostrando ${filteredProducts.length} productos con filtros responsivos y grid adaptable.`}
        />
        {productsQuery.isLoading ? (
          <ProductRailSkeleton count={8} />
        ) : filteredProducts.length ? (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={addItem} />
            ))}
          </div>
        ) : (
          <EmptyState title="No hay productos en esta vista" description="Prueba con otro rango de precio u ordenamiento." />
        )}
      </div>
    </div>
  );
}
