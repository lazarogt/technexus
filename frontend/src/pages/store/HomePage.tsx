import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductRailSkeleton } from "@/components/shared/ProductRailSkeleton";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { HeroBanner } from "@/components/store/HeroBanner";
import { TrustBar } from "@/components/store/TrustBar";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { trackOnce } from "@/features/analytics/analytics";
import { useCart } from "@/features/cart/cart-context";

export function HomePage() {
  const location = useLocation();
  const { addItem } = useCart();
  const featuredQuery = useQuery({
    queryKey: ["home", "featured"],
    queryFn: () => listProducts({ limit: 12 })
  });
  const dealsQuery = useQuery({
    queryKey: ["home", "deals"],
    queryFn: () => listProducts({ limit: 4, sort: "price-asc" })
  });
  const recommendationsQuery = useQuery({
    queryKey: ["home", "recommendations"],
    queryFn: () => listProducts({ limit: 4, sort: "name-asc" })
  });
  const categoriesQuery = useQuery({
    queryKey: ["home", "categories"],
    queryFn: listCategories
  });

  const spotlight = featuredQuery.data?.products[0];
  const topProducts = useMemo(() => featuredQuery.data?.products.slice(0, 4) ?? [], [featuredQuery.data]);

  useEffect(() => {
    trackOnce(`view-home:${location.key}`, "view_home");
  }, [location.key]);

  return (
    <div className="store-page stack-xl">
      <HeroBanner spotlight={spotlight} />

      <section className="stack-md">
        <SectionHeading
          eyebrow="Compra con confianza"
          title="Todo listo para convertir desde la primera vista"
          description="Señales de confianza y beneficios claros para aumentar add-to-cart y acelerar checkout."
        />
        <TrustBar />
      </section>

      <section className="stack-md">
        <SectionHeading
          title="Ofertas"
          description="Selección orientada a precio para convertir más rápido."
          action={<Link to="/products">Ver todo</Link>}
        />
        {dealsQuery.isLoading ? (
          <ProductRailSkeleton />
        ) : (
          <div className="product-rail">
            {(dealsQuery.data?.products ?? []).map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={addItem} badge="Oferta" />
            ))}
          </div>
        )}
      </section>

      <section className="stack-md">
        <SectionHeading
          title="Más vendidos"
          description="Base principal del catálogo público para una experiencia tipo marketplace."
        />
        {featuredQuery.isLoading ? (
          <ProductRailSkeleton />
        ) : (
          <div className="product-rail">
            {topProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={addItem} badge="Popular" />
            ))}
          </div>
        )}
      </section>

      <section className="stack-md">
        <SectionHeading
          eyebrow="Explora por intención"
          title="Categorías con salida rápida"
          description="Navega directo al catálogo con menos fricción y mayor visibilidad de producto."
        />
        <div className="category-feature-grid">
          {(categoriesQuery.data?.categories ?? []).slice(0, 6).map((category) => (
            <Link key={category.id} to={`/category/${category.id}`} className="category-feature-card">
              <span>{category.name}</span>
              <small>Ver productos</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="stack-md">
        <SectionHeading
          title="Recomendados"
          description="Surtido equilibrado para descubrir nuevas referencias sin salir de la tienda."
        />
        {recommendationsQuery.isLoading ? (
          <ProductRailSkeleton />
        ) : (
          <div className="product-rail">
            {(recommendationsQuery.data?.products ?? []).map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={addItem} badge="Recomendado" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
