import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="app-shell">
      <section className="commerce-panel">
        <div className="empty-state">
          <h3>La ruta que buscas no existe.</h3>
          <p>Vuelve al marketplace para seguir comprando, gestionando pedidos o revisando mensajes.</p>
          <Link className="ghost-button" to="/">
            Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
