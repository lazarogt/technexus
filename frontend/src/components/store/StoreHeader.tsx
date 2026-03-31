import { Search, ShoppingCart, UserRound } from "lucide-react";
import { startTransition, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/features/cart/cart-context";
import { useAuth } from "@/features/auth/auth-context";

export function StoreHeader() {
  const navigate = useNavigate();
  const { cart } = useCart();
  const { isAuthenticated, role, user, logout } = useAuth();
  const [search, setSearch] = useState("");

  const dashboardHref = role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/account";
  const ordersHref = role === "seller" ? "/seller/orders" : role === "admin" ? "/admin/orders" : "/account/orders";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
    });
  };

  return (
    <header className="store-header">
      <div className="store-header-inner">
        <Link to="/" className="brand-mark">
          <span>Tech</span>Nexus
        </Link>
        <form className="store-search" onSubmit={handleSubmit}>
          <input
            aria-label="Buscar productos"
            data-testid="store-search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar tecnología, accesorios y más"
          />
          <button type="submit" aria-label="Buscar">
            <Search size={18} />
          </button>
        </form>
        <nav className="store-actions">
          {isAuthenticated ? (
            <>
              <Link to={dashboardHref} className="header-link">
                <span data-testid="dashboard-link-label">
                <UserRound size={18} />
                <span>{user?.name.split(" ")[0] ?? "Cuenta"}</span>
                </span>
              </Link>
              <Link to={ordersHref} className="header-link">
                Pedidos
              </Link>
              <button type="button" className="header-link header-link-button" onClick={logout}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="header-link">
                Ingresar
              </Link>
              <Link to="/register" className="header-link">
                Crear cuenta
              </Link>
            </>
          )}
          <Link to="/cart" className="header-link cart-link">
            <ShoppingCart size={18} />
            <span>Carrito</span>
            <strong data-testid="cart-count">{cart.items.length}</strong>
          </Link>
        </nav>
      </div>
    </header>
  );
}
