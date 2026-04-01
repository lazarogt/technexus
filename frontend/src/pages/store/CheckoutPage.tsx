import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { TextField } from "@/components/shared/TextField";
import { TrustBar } from "@/components/store/TrustBar";
import type { OrderRecord } from "@/features/api/types";
import { track, trackOnce } from "@/features/analytics/analytics";
import { useAuth } from "@/features/auth/auth-context";
import { useCart } from "@/features/cart/cart-context";
import { formatCurrency } from "@/lib/format";

const CHECKOUT_STEPS = [
  { id: 1, label: "Envio" },
  { id: 2, label: "Revision" },
  { id: 3, label: "Confirmacion" }
] as const;

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { cart, checkout } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<OrderRecord | null>(null);
  const [currentStep, setCurrentStep] = useState<(typeof CHECKOUT_STEPS)[number]["id"]>(1);
  const [form, setForm] = useState({
    buyerName: user?.name ?? "",
    buyerEmail: user?.email ?? "",
    buyerPhone: "",
    shippingAddress: "",
    shippingCost: "0"
  });

  const shippingTotal = cart.total + Number(form.shippingCost || 0);

  const validateStepOne = () => {
    if (!isAuthenticated && (!form.buyerName.trim() || !form.buyerEmail.trim())) {
      return "Completa nombre y correo para continuar.";
    }

    if (!form.shippingAddress.trim()) {
      return "Agrega una direccion de entrega para continuar.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (currentStep === 1) {
      const validationMessage = validateStepOne();

      if (validationMessage) {
        setError(validationMessage);
        return;
      }

      trackOnce(`start-checkout:${location.key}`, "start_checkout", {
        itemCount: cart.items.length,
        total: shippingTotal
      });
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);

    try {
      const order = await checkout({
        buyerName: isAuthenticated ? undefined : form.buyerName,
        buyerEmail: isAuthenticated ? undefined : form.buyerEmail,
        buyerPhone: form.buyerPhone,
        shippingAddress: form.shippingAddress,
        shippingCost: Number(form.shippingCost || 0)
      });

      track("complete_order", {
        orderId: order.id,
        total: order.total,
        itemCount: order.items.length,
        sellerIds: [...new Set(order.items.map((item) => item.sellerId))]
      });

      if (isAuthenticated) {
        navigate("/account/orders");
        return;
      }

      setPlacedOrder(order);
      setCurrentStep(3);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "No se pudo procesar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="store-page">
        <div className="checkout-success-card" data-testid="checkout-success">
          <p className="section-eyebrow">Pedido confirmado</p>
          <h1>Orden #{placedOrder.id.slice(0, 8)}</h1>
          <p>
            El pedido quedo registrado con pago contra entrega. Guarda este folio y revisa tu correo
            para el siguiente paso.
          </p>
          <div className="checkout-success-grid">
            <div className="stack-sm">
              <strong>Total confirmado</strong>
              <span>{formatCurrency(placedOrder.total)}</span>
            </div>
            <div className="stack-sm">
              <strong>Entrega</strong>
              <span>{placedOrder.shippingAddress ?? "Direccion confirmada en checkout"}</span>
            </div>
          </div>
          <TrustBar />
          <div className="button-row">
            <Button onClick={() => navigate("/products")}>Seguir comprando</Button>
            <Button variant="secondary" onClick={() => navigate("/cart")}>
              Ver carrito
            </Button>
          </div>
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
        description="Flujo guiado para completar tu pedido con menos friccion y mas confianza."
      />
      <div className="checkout-steps" data-testid="checkout-steps" aria-label="Progreso del checkout">
        {CHECKOUT_STEPS.map((step) => (
          <div
            key={step.id}
            data-testid={`checkout-step-${step.id}`}
            className={step.id <= currentStep ? "checkout-step is-active" : "checkout-step"}
          >
            <strong>{step.id}</strong>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
      <div className="cart-layout">
        <form className="surface-card stack-md" data-testid="checkout-form" onSubmit={handleSubmit}>
          {currentStep === 1 ? (
            <>
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
              <TrustBar />
            </>
          ) : null}
          {currentStep === 2 ? (
            <div className="checkout-review stack-md">
              <div className="surface-card-subtle">
                <strong>Entrega</strong>
                <p>{form.shippingAddress}</p>
                <small>
                  {isAuthenticated ? user?.email : `${form.buyerName} · ${form.buyerEmail}`}
                </small>
              </div>
              <div className="surface-card-subtle">
                <strong>Contacto</strong>
                <p>{form.buyerPhone || "Se confirmara por correo si no agregas telefono."}</p>
                <small>Metodo de pago: contra entrega</small>
              </div>
              <TrustBar />
            </div>
          ) : null}
          {currentStep === 3 ? (
            <div className="checkout-review stack-md">
              <div className="surface-card-subtle">
                <strong>Listo para confirmar</strong>
                <p>Revisamos tu pedido, direccion y total final. Al confirmar se crea la orden inmediatamente.</p>
              </div>
              <TrustBar />
            </div>
          ) : null}
          {error ? <p className="field-error">{error}</p> : null}
          <div className="checkout-actions">
            {currentStep > 1 ? (
              <Button variant="ghost" onClick={() => setCurrentStep((current) => (current === 3 ? 2 : 1))}>
                Volver
              </Button>
            ) : null}
            <Button type="submit" fullWidth disabled={isSubmitting}>
              {currentStep === 1 ? "Continuar a revision" : currentStep === 2 ? "Ir a confirmacion" : isSubmitting ? "Procesando..." : "Confirmar pedido"}
            </Button>
          </div>
        </form>
        <aside className="order-summary-card checkout-summary-card">
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
            <span>Envio</span>
            <strong>{formatCurrency(Number(form.shippingCost || 0))}</strong>
          </div>
          <div className="summary-row">
            <span>Total</span>
            <strong>{formatCurrency(shippingTotal)}</strong>
          </div>
          <div className="checkout-summary-note">
            <strong>CTA principal</strong>
            <p>Confirma tu pedido con pago contra entrega y seguimiento por correo.</p>
          </div>
        </aside>
      </div>
      <div className="mobile-checkout-summary">
        <div>
          <small>Total</small>
          <strong>{formatCurrency(shippingTotal)}</strong>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            const formElement = document.querySelector<HTMLFormElement>("[data-testid='checkout-form']");
            formElement?.requestSubmit();
          }}
          disabled={isSubmitting}
        >
          {currentStep === 3 ? "Confirmar pedido" : "Continuar"}
        </button>
      </div>
    </div>
  );
}
