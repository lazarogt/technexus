import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { TextField } from "@/components/shared/TextField";
import type { OrderRecord } from "@/features/api/types";
import { useAuth } from "@/features/auth/auth-context";
import { useCart } from "@/features/cart/cart-context";
import { formatCurrency } from "@/lib/format";

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { cart, checkout } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<OrderRecord | null>(null);
  const [form, setForm] = useState({
    buyerName: user?.name ?? "",
    buyerEmail: user?.email ?? "",
    buyerPhone: "",
    shippingAddress: "",
    shippingCost: "0"
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const order = await checkout({
        buyerName: isAuthenticated ? undefined : form.buyerName,
        buyerEmail: isAuthenticated ? undefined : form.buyerEmail,
        buyerPhone: form.buyerPhone,
        shippingAddress: form.shippingAddress,
        shippingCost: Number(form.shippingCost || 0)
      });

      if (isAuthenticated) {
        navigate("/account/orders");
        return;
      }

      setPlacedOrder(order);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "No se pudo procesar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="store-page">
        <div className="auth-card" data-testid="checkout-success">
          <p className="section-eyebrow">Pedido confirmado</p>
          <h1>Orden #{placedOrder.id.slice(0, 8)}</h1>
          <p>
            El pedido quedó registrado con pago contra entrega. Guarda este folio y revisa tu correo
            para el siguiente paso.
          </p>
          <Button onClick={() => navigate("/products")}>Volver al catálogo</Button>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return <EmptyState title="No hay items para pagar" description="Agrega productos al carrito antes de abrir el checkout." />;
  }

  return (
    <div className="store-page stack-lg">
      <SectionHeading
        title="Checkout"
        description="Pago contra entrega con soporte para invitado, totales visibles y confirmación inmediata."
      />
      <div className="cart-layout">
        <form className="surface-card stack-md" data-testid="checkout-form" onSubmit={handleSubmit}>
          {!isAuthenticated ? (
            <>
              <TextField label="Nombre" value={form.buyerName} onChange={(event) => setForm((current) => ({ ...current, buyerName: event.target.value }))} required />
              <TextField label="Correo" type="email" value={form.buyerEmail} onChange={(event) => setForm((current) => ({ ...current, buyerEmail: event.target.value }))} required />
            </>
          ) : (
            <div className="account-banner">
              Comprando como <strong>{user?.email}</strong>
            </div>
          )}
          <TextField label="Teléfono" value={form.buyerPhone} onChange={(event) => setForm((current) => ({ ...current, buyerPhone: event.target.value }))} />
          <TextField
            label="Dirección de entrega"
            multiline
            rows={4}
            value={form.shippingAddress}
            onChange={(event) => setForm((current) => ({ ...current, shippingAddress: event.target.value }))}
          />
          <TextField
            label="Costo de envío"
            type="number"
            min="0"
            step="0.01"
            value={form.shippingCost}
            onChange={(event) => setForm((current) => ({ ...current, shippingCost: event.target.value }))}
          />
          {error ? <p className="field-error">{error}</p> : null}
          <Button type="submit" fullWidth disabled={isSubmitting}>
            Confirmar pedido
          </Button>
        </form>
        <aside className="order-summary-card">
          <h3>Tu pedido</h3>
          {cart.items.map((item) => (
            <div key={item.id} className="summary-row">
              <span>
                {item.quantity} x {item.productName}
              </span>
              <strong>{formatCurrency(item.subtotal)}</strong>
            </div>
          ))}
          <div className="summary-row">
            <span>Total</span>
            <strong>{formatCurrency(cart.total + Number(form.shippingCost || 0))}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
