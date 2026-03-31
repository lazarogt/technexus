import { Search, ShoppingCart, UserRound } from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/features/cart/cart-context";
import { useAuth } from "@/features/auth/auth-context";
import { formatCurrency } from "@/lib/format";

export function StoreHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, isLoading, lastAddedItem, cartAttentionTick } = useCart();
  const { isAuthenticated, role, user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [manualOpenKey, setManualOpenKey] = useState<string | null>(null);
  const [dismissedTick, setDismissedTick] = useState(0);
  const miniCartRef = useRef<HTMLDivElement | null>(null);

  const dashboardHref = role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/account";
  const ordersHref = role === "seller" ? "/seller/orders" : role === "admin" ? "/admin/orders" : "/account/orders";
  const isMiniCartOpen = manualOpenKey === location.key || cartAttentionTick > dismissedTick;
  const cartTriggerClass =
    cartAttentionTick === 0
      ? ""
      : cartAttentionTick % 2 === 0
        ? "is-bumping-a"
        : "is-bumping-b";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
    });
  };

  useEffect(() => {
    if (!isMiniCartOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!miniCartRef.current?.contains(event.target as Node)) {
        setManualOpenKey(null);
        setDismissedTick(cartAttentionTick);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [cartAttentionTick, isMiniCartOpen]);

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
          <div ref={miniCartRef} className="mini-cart-shell">
            <button
              type="button"
              className={`header-link cart-link cart-trigger ${cartTriggerClass}`}
              onClick={() => {
                if (isMiniCartOpen) {
                  setManualOpenKey(null);
                  setDismissedTick(cartAttentionTick);
                  return;
                }

                setManualOpenKey(location.key);
              }}
              aria-expanded={isMiniCartOpen}
              aria-controls="mini-cart-panel"
            >
              <ShoppingCart size={18} />
              <span>Carrito</span>
              <strong
                key={cartAttentionTick}
                data-testid="cart-count"
              >
                {cart.items.length}
              </strong>
            </button>
            <div id="mini-cart-panel" className={isMiniCartOpen ? "mini-cart-panel is-open" : "mini-cart-panel"}>
              <div className="mini-cart-header">
                <div>
                  <strong>{cart.items.length} productos</strong>
                  <p>{isLoading ? "Actualizando carrito..." : "Checkout rapido y pago contra entrega."}</p>
                </div>
                <button
                  type="button"
                  className="mini-cart-close"
                  onClick={() => {
                    setManualOpenKey(null);
                    setDismissedTick(cartAttentionTick);
                  }}
                >
                  Cerrar
                </button>
              </div>
              {cart.items.length ? (
                <>
                  <div className="mini-cart-items">
                    {cart.items.slice(0, 4).map((item) => (
                      <article key={item.id} className="mini-cart-item">
                        <img src={item.productImages[0]} alt={item.productName} loading="lazy" />
                        <div className="stack-xs">
                          <strong>{item.productName}</strong>
                          <small>
                            {item.quantity} x {formatCurrency(item.productPrice)}
                          </small>
                        </div>
                        <b>{formatCurrency(item.subtotal)}</b>
                      </article>
                    ))}
                  </div>
                  <div className="mini-cart-summary">
                    <div className="summary-row">
                      <span>Total</span>
                      <strong>{formatCurrency(cart.total)}</strong>
                    </div>
                    {lastAddedItem ? <p className="mini-cart-highlight">Agregaste {lastAddedItem.productName}.</p> : null}
                    <div className="mini-cart-actions">
                      <Link to="/cart" className="mini-cart-link">
                        Ver carrito
                      </Link>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => navigate(cart.items.length ? "/checkout" : "/cart")}
                      >
                        Checkout rapido
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mini-cart-empty">
                  <strong>Tu carrito te espera</strong>
                  <p>Agrega productos para ver el resumen y avanzar mas rapido al checkout.</p>
                  <Link to="/products" className="mini-cart-link">
                    Explorar catalogo
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
      <div className={isMiniCartOpen ? "mini-cart-sheet is-open" : "mini-cart-sheet"}>
        <button
          type="button"
          className="mini-cart-backdrop"
          aria-label="Cerrar mini carrito"
          onClick={() => {
            setManualOpenKey(null);
            setDismissedTick(cartAttentionTick);
          }}
        />
        <div className="mini-cart-sheet-panel">
          <div className="mini-cart-header">
            <div>
              <strong>Tu carrito</strong>
              <p>Compra segura y pago contra entrega.</p>
            </div>
            <button
              type="button"
              className="mini-cart-close"
              onClick={() => {
                setManualOpenKey(null);
                setDismissedTick(cartAttentionTick);
              }}
            >
              Cerrar
            </button>
          </div>
          <div className="mini-cart-items">
            {cart.items.length ? (
              cart.items.slice(0, 4).map((item) => (
                <article key={item.id} className="mini-cart-item">
                  <img src={item.productImages[0]} alt={item.productName} loading="lazy" />
                  <div className="stack-xs">
                    <strong>{item.productName}</strong>
                    <small>
                      {item.quantity} x {formatCurrency(item.productPrice)}
                    </small>
                  </div>
                  <b>{formatCurrency(item.subtotal)}</b>
                </article>
              ))
            ) : (
              <div className="mini-cart-empty">
                <strong>Tu carrito esta vacio</strong>
                <p>Descubre ofertas, agrega productos y vuelve aqui para confirmar tu pedido.</p>
              </div>
            )}
          </div>
          <div className="mini-cart-summary">
            <div className="summary-row">
              <span>Total</span>
              <strong>{formatCurrency(cart.total)}</strong>
            </div>
            <div className="mini-cart-actions">
              <Link to="/cart" className="mini-cart-link">
                Ver carrito
              </Link>
              <button
                type="button"
                className="button button-primary"
                onClick={() => navigate(cart.items.length ? "/checkout" : "/products")}
              >
                {cart.items.length ? "Checkout rapido" : "Seguir comprando"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
