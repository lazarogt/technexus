import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { TrustBar } from "@/components/store/TrustBar";
import type { Product } from "@/features/api/types";
import { formatCurrency } from "@/lib/format";

type HeroBannerProps = {
  spotlight?: Product;
};

export function HeroBanner({ spotlight }: HeroBannerProps) {
  return (
    <section className="hero-banner">
      <div className="hero-copy">
        <p className="section-eyebrow">Marketplace tecnológico</p>
        <h1>Todo tu stack comercial, tienda y operación en una sola vitrina.</h1>
        <p>
          Descubre hardware, accesorios y herramientas listas para entrega inmediata con experiencia
          de compra clara y paneles operativos separados por rol.
        </p>
        <TrustBar />
        <div className="hero-actions">
          <Link to="/products" className="hero-primary">
            Ver catálogo
          </Link>
          <Link to="/register" className="hero-secondary">
            Vender en TechNexus
          </Link>
        </div>
      </div>
      <div className="hero-spotlight">
        {spotlight ? (
          <>
            <img src={spotlight.images[0]} alt={spotlight.name} loading="lazy" />
            <div className="hero-spotlight-card">
              <span>Spotlight</span>
              <strong>{spotlight.name}</strong>
              <p>{spotlight.categoryName}</p>
              <div>
                <b>{formatCurrency(spotlight.price)}</b>
                <Link to={`/product/${spotlight.id}`}>
                  Ver detalle <ArrowRight size={16} />
                </Link>
              </div>
              <small>Pago contra entrega y checkout rapido.</small>
            </div>
          </>
        ) : (
          <div className="hero-placeholder">
            <strong>Carga inteligente de catálogo</strong>
            <p>El home se nutre desde `/api/products` sin alterar el backend.</p>
          </div>
        )}
      </div>
    </section>
  );
}
