import { ShoppingCart, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SearchBar } from "@/components/store/layout/SearchBar";
import { useAuth } from "@/features/auth/auth-context";
import { useCart } from "@/features/cart/cart-context";
import { formatCurrency } from "@/lib/format";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, isLoading, lastAddedItem, cartAttentionTick } = useCart();
  const { isAuthenticated, role, user, logout } = useAuth();
  const [manualOpenKey, setManualOpenKey] = useState<string | null>(null);
  const [dismissedTick, setDismissedTick] = useState(0);
  const miniCartRef = useRef<HTMLDivElement | null>(null);

  const dashboardHref = role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/account";
  const ordersHref = role === "seller" ? "/seller/orders" : role === "admin" ? "/admin/orders" : "/account/orders";
  const isMiniCartOpen = manualOpenKey === location.key || cartAttentionTick > dismissedTick;
  const cartTriggerClass =
    cartAttentionTick === 0 ? "" : cartAttentionTick % 2 === 0 ? "is-bumping-a" : "is-bumping-b";

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
        <div className="store-header-brand">
          <Link to="/" className="brand-mark">
            <span>Tech</span>Nexus
          </Link>
          <small>Marketplace tech listo para convertir</small>
        </div>
        <SearchBar className="store-header-search" />
        <nav className="store-actions" aria-label="Primary">
          {isAuthenticated ? (
            <>
              <Link to={dashboardHref} className="header-link">
                <UserRound size={18} />
                <span>{user?.name.split(" ")[0] ?? "Cuenta"}</span>
              </Link>
              <Link to={ordersHref} className="header-link">
                Orders
              </Link>
              <button type="button" className="header-link header-link-button" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="header-link">
                Account
              </Link>
              <Link to="/register" className="header-link">
                Join
              </Link>
            </>
          )}
          <div ref={miniCartRef} className="mini-cart-shell">
            <button
              type="button"
              className={`header-link cart-link cart-trigger ${cartTriggerClass}`}
              data-testid="cart-trigger"
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
              <span>Cart</span>
              <strong key={cartAttentionTick} data-testid="cart-count">
                {cart.items.length}
              </strong>
            </button>
            <div id="mini-cart-panel" data-testid="mini-cart-panel" className={isMiniCartOpen ? "mini-cart-panel is-open" : "mini-cart-panel"}>
              <div className="mini-cart-header">
                <div>
                  <strong>{cart.items.length} items</strong>
                  <p>{isLoading ? "Refreshing cart..." : "Fast checkout with delivery confirmation."}</p>
                </div>
                <button
                  type="button"
                  className="mini-cart-close"
                  onClick={() => {
                    setManualOpenKey(null);
                    setDismissedTick(cartAttentionTick);
                  }}
                >
                  Close
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
                    {lastAddedItem ? <p className="mini-cart-highlight">Added {lastAddedItem.productName} to your cart.</p> : null}
                    <div className="mini-cart-actions">
                      <Link to="/cart" className="mini-cart-link">
                        View cart
                      </Link>
                      <button
                        type="button"
                        data-testid="mini-cart-checkout"
                        className="button button-primary"
                        onClick={() => navigate(cart.items.length ? "/checkout" : "/cart")}
                      >
                        Checkout
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mini-cart-empty">
                  <strong>Your cart is empty</strong>
                  <p>Add products to compare pricing, delivery and seller trust signals.</p>
                  <Link to="/products" className="mini-cart-link">
                    Browse catalog
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
      <div data-testid="mini-cart-sheet" className={isMiniCartOpen ? "mini-cart-sheet is-open" : "mini-cart-sheet"}>
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
              <strong>Your cart</strong>
              <p>Secure delivery and live inventory.</p>
            </div>
            <button
              type="button"
              className="mini-cart-close"
              onClick={() => {
                setManualOpenKey(null);
                setDismissedTick(cartAttentionTick);
              }}
            >
              Close
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
                <strong>Your cart is empty</strong>
                <p>Browse trending products and add a few items to continue.</p>
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
                View cart
              </Link>
              <button
                type="button"
                className="button button-primary"
                onClick={() => navigate(cart.items.length ? "/checkout" : "/products")}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
