import { ShoppingCart, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SearchBar } from "@/components/store/layout/SearchBar";
import { useAuth } from "@/features/auth/auth-context";
import { useCart } from "@/features/cart/cart-context";
import { ES, getProductCountLabel } from "@/i18n/es";
import { formatCurrency } from "@/lib/format";

export function Header() {
  const { t } = useTranslation();
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
          <small>{t("nav.marketplaceReady")}</small>
        </div>
        <SearchBar className="store-header-search" />
        <nav className="store-actions" aria-label={ES.nav.main}>
          {isAuthenticated ? (
            <>
              <Link to={dashboardHref} className="header-link">
                <UserRound size={18} />
                <span>{user?.name.split(" ")[0] ?? ES.nav.account}</span>
              </Link>
              <Link to={ordersHref} className="header-link">
                {ES.nav.orders}
              </Link>
              <button type="button" className="header-link header-link-button" onClick={logout}>
                {ES.buttons.logout}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="header-link">
                {ES.nav.account}
              </Link>
              <Link to="/register" className="header-link">
                {ES.buttons.createAccount}
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
              <span>{ES.nav.cart}</span>
              <strong key={cartAttentionTick} data-testid="cart-count">
                {cart.items.length}
              </strong>
            </button>
            <div id="mini-cart-panel" data-testid="mini-cart-panel" className={isMiniCartOpen ? "mini-cart-panel is-open" : "mini-cart-panel"}>
              <div className="mini-cart-header">
                <div>
                  <strong>{getProductCountLabel(cart.items.length)}</strong>
                  <p>{isLoading ? ES.cart.updating : ES.cart.quickPurchase}</p>
                </div>
                <button
                  type="button"
                  className="mini-cart-close"
                  onClick={() => {
                    setManualOpenKey(null);
                    setDismissedTick(cartAttentionTick);
                  }}
                >
                  {ES.buttons.close}
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
                      <span>{ES.labels.total}</span>
                      <strong>{formatCurrency(cart.total)}</strong>
                    </div>
                    {lastAddedItem ? <p className="mini-cart-highlight">{ES.cart.addedToCart(lastAddedItem.productName)}</p> : null}
                    <div className="mini-cart-actions">
                      <Link to="/cart" className="mini-cart-link">
                        {ES.buttons.viewCart}
                      </Link>
                      <button
                        type="button"
                        data-testid="mini-cart-checkout"
                        className="button button-primary"
                        onClick={() => navigate(cart.items.length ? "/checkout" : "/cart")}
                      >
                        {ES.buttons.checkout}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mini-cart-empty">
                  <strong>{ES.cart.emptyTitle}</strong>
                  <p>{ES.cart.emptyDescription}</p>
                  <Link to="/products" className="mini-cart-link">
                    {ES.buttons.viewCatalog}
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
          aria-label={t("buttons.close")}
          onClick={() => {
            setManualOpenKey(null);
            setDismissedTick(cartAttentionTick);
          }}
        />
        <div className="mini-cart-sheet-panel">
          <div className="mini-cart-header">
            <div>
              <strong>{ES.nav.cart}</strong>
              <p>{ES.cart.secureDelivery}</p>
            </div>
            <button
              type="button"
              className="mini-cart-close"
              onClick={() => {
                setManualOpenKey(null);
                setDismissedTick(cartAttentionTick);
              }}
            >
              {ES.buttons.close}
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
                <strong>{ES.cart.emptyTitle}</strong>
                <p>{ES.cart.emptySheetDescription}</p>
              </div>
            )}
          </div>
          <div className="mini-cart-summary">
            <div className="summary-row">
              <span>{ES.labels.total}</span>
              <strong>{formatCurrency(cart.total)}</strong>
            </div>
            <div className="mini-cart-actions">
              <Link to="/cart" className="mini-cart-link">
                {ES.buttons.viewCart}
              </Link>
              <button
                type="button"
                className="button button-primary"
                onClick={() => navigate(cart.items.length ? "/checkout" : "/products")}
              >
                {ES.buttons.continue}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
