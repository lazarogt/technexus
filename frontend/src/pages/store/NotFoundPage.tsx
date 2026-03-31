import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="section-eyebrow">404</p>
        <h1>Esta vista no existe</h1>
        <p>La ruta solicitada no forma parte del storefront ni de los paneles de TechNexus.</p>
        <Link to="/">Volver al inicio</Link>
      </div>
    </div>
  );
}
