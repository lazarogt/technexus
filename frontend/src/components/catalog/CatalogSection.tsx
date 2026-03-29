import { startTransition } from "react";
import { catalogSortOptions, type CatalogSort, type Category, type PaginationMeta, type Product } from "../../lib/types";
import { CatalogSkeleton } from "./CatalogSkeleton";
import { ProductCard } from "./ProductCard";
import { PaginationControls } from "../ui/PaginationControls";

type CatalogSectionProps = {
  categories: Category[];
  products: Product[];
  catalogError: string;
  catalogLoading: boolean;
  selectedCategoryId: string;
  searchInput: string;
  sort: CatalogSort;
  pagination: PaginationMeta;
  busyAction: string | null;
  onCategoryChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: CatalogSort) => void;
  onAddToCart: (productId: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export function CatalogSection(props: CatalogSectionProps) {
  return (
    <section className="catalog-panel catalog-panel--storefront">
      <div className="storefront-hero">
        <div>
          <span className="section-heading__eyebrow">Storefront</span>
          <h2>Encuentra tecnologia lista para entrega sin salir del marketplace.</h2>
          <p className="panel-note">
            Busca rapido, filtra por categoria y compara productos con una vista mas
            cercana a un ecommerce real.
          </p>
        </div>
        {props.catalogLoading ? (
          <span className="section-heading__status">Actualizando catalogo...</span>
        ) : null}
      </div>

      <div className="storefront-searchbar">
        <label>
          Buscar producto
          <input
            onChange={(event) => {
              const nextValue = event.target.value;
              startTransition(() => {
                props.onSearchChange(nextValue);
              });
            }}
            placeholder="Laptop, monitor, teclado, tablet..."
            value={props.searchInput}
          />
        </label>
        <label>
          Ordenar
          <select
            onChange={(event) => props.onSortChange(event.target.value as CatalogSort)}
            value={props.sort}
          >
            {catalogSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="category-filter-bar" role="tablist" aria-label="Categorias del catalogo">
        <button
          className={props.selectedCategoryId === "" ? "is-active" : ""}
          onClick={() => props.onCategoryChange("")}
          type="button"
        >
          Todo el catalogo
        </button>
        {props.categories.map((category) => (
          <button
            className={props.selectedCategoryId === category.id ? "is-active" : ""}
            key={category.id}
            onClick={() => props.onCategoryChange(category.id)}
            type="button"
          >
            {category.name}
          </button>
        ))}
      </div>

      {props.catalogError ? <p className="panel-error">{props.catalogError}</p> : null}

      {props.catalogLoading && props.products.length === 0 ? <CatalogSkeleton /> : null}

      {!props.catalogLoading || props.products.length > 0 ? (
        <div className="catalog-grid catalog-grid--dense">
          {props.products.length > 0 ? (
            props.products.map((product) => (
              <ProductCard
                busyAction={props.busyAction}
                key={product.id}
                onAddToCart={props.onAddToCart}
                product={product}
              />
            ))
          ) : (
            <div className="empty-state">
              <h3>No hay productos para ese filtro.</h3>
              <p>Prueba otra categoria, cambia el orden o ajusta la busqueda.</p>
            </div>
          )}
        </div>
      ) : null}

      <PaginationControls
        onNext={props.onNextPage}
        onPrevious={props.onPreviousPage}
        pagination={props.pagination}
      />
    </section>
  );
}
