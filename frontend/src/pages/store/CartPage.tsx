import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { TrustBar } from "@/components/store/TrustBar";
import { trackOnce } from "@/features/analytics/analytics";
import { useCart } from "@/features/cart/cart-context";
import { ES } from "@/i18n/es";
import { formatCurrency } from "@/lib/format";

export function CartPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { cart, removeItem, isLoading } = useCart();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    trackOnce(`view-cart:${location.key}`, "view_cart", {
      itemCount: cart.items.length,
      total: cart.total
    });
  }, [cart.items.length, cart.total, isLoading, location.key]);

  if (cart.items.length === 0) {
    return (
      <div className="store-page">
        <EmptyState title={ES.cart.emptyTitle} description={t("cart.emptyPageDescription")} />
      </div>
    );
  }

  return (
    <div className="store-page stack-lg">
      <SectionHeading title={ES.nav.cart} description={t("cart.pageDescription")} />
      <TrustBar />
      <div className="cart-layout">
        <div className="cart-items">
          {cart.items.map((item) => (
            <article key={item.id} className="cart-item" data-testid={`cart-item-${item.productId}`}>
              <img src={item.productImages[0]} alt={item.productName} loading="lazy" />
              <div className="stack-xs">
                <Link to={`/product/${item.productId}`} className="product-card-title">
                  {item.productName}
                </Link>
                <p>{item.productDescription}</p>
                <small>
                  {item.quantity} x {formatCurrency(item.productPrice)}
                </small>
              </div>
              <div className="stack-xs">
                <strong>{formatCurrency(item.subtotal)}</strong>
                <Button variant="ghost" onClick={() => removeItem(item.productId)} disabled={isLoading}>
                  {ES.buttons.remove}
                </Button>
              </div>
            </article>
          ))}
        </div>
        <aside className="order-summary-card">
          <h3>{ES.labels.summary}</h3>
          <div className="summary-row">
            <span>{ES.labels.products}</span>
            <strong>{cart.items.length}</strong>
          </div>
          <div className="summary-row">
            <span>{ES.labels.total}</span>
            <strong data-testid="cart-total">{formatCurrency(cart.total)}</strong>
          </div>
          <p className="checkout-summary-note">{t("cart.securePurchaseNote")}</p>
          <Button data-testid="checkout-button" fullWidth onClick={() => navigate("/checkout")}>
            {ES.buttons.checkout}
          </Button>
        </aside>
      </div>
    </div>
  );
}
