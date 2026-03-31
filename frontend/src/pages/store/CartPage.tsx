import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { useCart } from "@/features/cart/cart-context";
import { formatCurrency } from "@/lib/format";

export function CartPage() {
  const navigate = useNavigate();
  const { cart, removeItem, isLoading } = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="store-page">
        <EmptyState title="Tu carrito está vacío" description="Agrega productos desde el catálogo para iniciar una compra o un checkout como invitado." />
      </div>
    );
  }

  return (
    <div className="store-page stack-lg">
      <SectionHeading title="Carrito" description="Resumen sincronizado con backend y listo para checkout COD." />
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
                  Quitar
                </Button>
              </div>
            </article>
          ))}
        </div>
        <aside className="order-summary-card">
          <h3>Resumen</h3>
          <div className="summary-row">
            <span>Productos</span>
            <strong>{cart.items.length}</strong>
          </div>
          <div className="summary-row">
            <span>Total</span>
            <strong data-testid="cart-total">{formatCurrency(cart.total)}</strong>
          </div>
          <Button data-testid="checkout-button" fullWidth onClick={() => navigate("/checkout")}>
            Continuar al checkout
          </Button>
        </aside>
      </div>
    </div>
  );
}
