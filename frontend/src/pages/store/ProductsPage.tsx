import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { startTransition, useDeferredValue, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductCard } from "@/components/catalog/ProductCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";

export function ProductsPage() {
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");
  const deferredSearch = useDeferredValue(searchParams.get("search") ?? "");
  const page = Number(searchParams.get("page") ?? 1);
  const sort = searchParams.get("sort") ?? "latest";
  const categoryId = searchParams.get("categoryId") ?? "";

  const categoriesQuery = useQuery({
    queryKey: ["products", "categories"],
    queryFn: listCategories
  });

  const productsQuery = useQuery({
    queryKey: ["products", page, deferredSearch, sort, categoryId],
    queryFn: () =>
      listProducts({
        page,
        limit: 12,
        search: deferredSearch,
        sort,
        categoryId: categoryId || undefined
      })
  });

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      const next = new URLSearchParams(searchParams);
      next.set("page", "1");
      if (searchText.trim()) {
        next.set("search", searchText.trim());
      } else {
        next.delete("search");
      }
      setSearchParams(next);
    });
  };

  return (
    <div className="store-page stack-lg">
      <SectionHeading
        eyebrow="Catálogo completo"
        title="Productos para compra pública"
        description="Búsqueda central, filtros rápidos y grid responsive 4/2/1 con datos reales desde `/api/products`."
      />

      <div className="catalog-toolbar">
        <form className="catalog-search-inline" onSubmit={handleSearch}>
          <Search size={16} />
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Buscar por nombre o descripción" />
        </form>
        <select
          value={sort}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            next.set("sort", event.target.value);
            next.set("page", "1");
            setSearchParams(next);
          }}
        >
          <option value="latest">Más recientes</option>
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="price-desc">Precio: mayor a menor</option>
          <option value="name-asc">Nombre A-Z</option>
          <option value="name-desc">Nombre Z-A</option>
        </select>
      </div>

      <div className="chip-row">
        <button
          type="button"
          className={categoryId ? "chip" : "chip is-active"}
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.delete("categoryId");
            next.set("page", "1");
            setSearchParams(next);
          }}
        >
          Todas
        </button>
        {(categoriesQuery.data?.categories ?? []).map((category) => (
          <button
            key={category.id}
            type="button"
            className={categoryId === category.id ? "chip is-active" : "chip"}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set("categoryId", category.id);
              next.set("page", "1");
              setSearchParams(next);
            }}
          >
            {category.name}
          </button>
        ))}
      </div>

      {productsQuery.data?.products.length ? (
        <>
          <div className="product-grid">
            {productsQuery.data.products.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={addItem} />
            ))}
          </div>
          <Pagination
            pagination={productsQuery.data.pagination}
            onChange={(nextPage) => {
              const next = new URLSearchParams(searchParams);
              next.set("page", String(nextPage));
              setSearchParams(next);
            }}
          />
        </>
      ) : (
        <EmptyState title="Sin resultados" description="Ajusta búsqueda, categoría o ordenamiento para encontrar productos." />
      )}
    </div>
  );
}
