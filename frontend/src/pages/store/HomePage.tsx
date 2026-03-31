import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { HeroBanner } from "@/components/store/HeroBanner";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";

export function HomePage() {
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

  return (
    <div className="store-page stack-xl">
      <HeroBanner spotlight={spotlight} />

      <section className="stack-md">
        <SectionHeading
          eyebrow="Explora por intención"
          title="Categorías con salida rápida"
          description="Navega directo al catálogo que ya vive en el backend sin duplicar reglas."
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
          title="Ofertas"
          description="Selección orientada a precio para convertir más rápido."
          action={<Link to="/products">Ver todo</Link>}
        />
        <div className="product-grid">
          {(dealsQuery.data?.products ?? []).map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={addItem} badge="Oferta" />
          ))}
        </div>
      </section>

      <section className="stack-md">
        <SectionHeading
          title="Más vendidos"
          description="Base principal del catálogo público para una experiencia tipo marketplace."
        />
        <div className="product-grid">
          {topProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={addItem} badge="Popular" />
          ))}
        </div>
      </section>

      <section className="stack-md">
        <SectionHeading
          title="Recomendados"
          description="Surtido equilibrado para descubrir nuevas referencias sin salir de la tienda."
        />
        <div className="product-grid">
          {(recommendationsQuery.data?.products ?? []).map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={addItem} badge="Recomendado" />
          ))}
        </div>
      </section>
    </div>
  );
}
