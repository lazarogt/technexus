import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CartSummary } from "../components/organisms/CartSummary";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { currencyFormatter } from "../lib/api";
import {
  defaultGuestCheckoutForm,
  type CartItem,
  type GroupedCartSeller
} from "../lib/types";
import { useCart, useRemoveFromCart } from "../hooks/useCart";
import { useCheckout } from "../hooks/useCheckout";
import { useSession } from "../lib/auth-context";

const SHIPPING_COST = 12;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const groupCartBySeller = (items: CartItem[]) => {
  const groups = new Map<string, GroupedCartSeller>();

  items.forEach((item) => {
    const existing = groups.get(item.sellerId);

    if (existing) {
      existing.items.push(item);
      existing.subtotal += item.subtotal;
      return;
    }

    groups.set(item.sellerId, {
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      items: [item],
      subtotal: item.subtotal
    });
  });

  return Array.from(groups.values());
};

export default function CheckoutPage() {
  const { token, user, role } = useSession();
  const [form, setForm] = useState(defaultGuestCheckoutForm);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  const cartQuery = useCart(token, {
    enabled: role === "customer"
  });
  const removeFromCart = useRemoveFromCart(token);
  const checkoutMutation = useCheckout(token);

  const cart = cartQuery.data ?? { items: [], total: 0 };
  const sellerGroups = useMemo(() => groupCartBySeller(cart.items), [cart.items]);
  const overallTotal = cart.total + SHIPPING_COST;

  const validationErrors = {
    name: form.name.trim().length < 2 ? "Name is required." : "",
    email: !emailPattern.test(form.email.trim()) ? "A valid email is required." : "",
    phone: form.phone.trim().length < 7 ? "Phone is required." : "",
    address: form.address.trim().length < 5 ? "Address is required." : ""
  };

  const formIsValid = Object.values(validationErrors).every((value) => value === "");

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name ?? "",
      email: user?.email ?? ""
    }));
  }, [user?.email, user?.name]);

  const handleConfirmOrder = async () => {
    setSubmitError("");
    setSubmitMessage("");

    if (role !== "customer") {
      setSubmitError("Only customer accounts can complete checkout.");
      return;
    }

    if (!formIsValid) {
      setSubmitError("Please complete all guest checkout fields correctly.");
      return;
    }

    try {
      const response = await checkoutMutation.mutateAsync({
        buyerPhone: form.phone.trim(),
        shippingAddress: form.address.trim(),
        shippingCost: SHIPPING_COST
      });

      setSubmitMessage(response.message);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to confirm order.");
    }
  };

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate">
        <Link className="font-semibold text-ink" to="/">
          Home
        </Link>
        <span>/</span>
        <span>Checkout</span>
      </nav>

      <section className="panel-surface overflow-hidden bg-ink px-6 py-8 text-white sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div>
            <span className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/70">
              Cash on Delivery
            </span>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-none sm:text-5xl">
              Review a multi-seller cart and confirm a COD order.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              Cart items are grouped by seller, totals are split per vendor and the final order is
              submitted to the existing backend checkout endpoint.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Sellers</p>
              <p className="mt-2 text-2xl font-bold text-white">{sellerGroups.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Items</p>
              <p className="mt-2 text-2xl font-bold text-white">{cart.items.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Shipping</p>
              <p className="mt-2 text-lg font-bold text-white">
                {currencyFormatter.format(SHIPPING_COST)}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/54">Total</p>
              <p className="mt-2 text-lg font-bold text-white">
                {currencyFormatter.format(overallTotal)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <section className="space-y-4">
          {cartQuery.isLoading ? (
            <Card title="Loading cart">
              <p className="text-sm text-slate">Loading cart...</p>
            </Card>
          ) : cart.items.length > 0 ? (
            <CartSummary
              busyProductId={removeFromCart.isPending ? removeFromCart.variables ?? null : null}
              cart={cart}
              groups={sellerGroups}
              onRemoveItem={(productId) => void removeFromCart.mutateAsync(productId)}
              shippingCost={SHIPPING_COST}
            />
          ) : (
            <Card className="text-center" title="Your cart is empty">
              <p className="mt-3 text-sm leading-7 text-slate">
                Add products from the marketplace before confirming checkout.
              </p>
              <Link className="action-primary mt-6" to="/">
                Browse marketplace
              </Link>
            </Card>
          )}
        </section>

        <aside className="space-y-4">
          <Card
            actions={<Badge variant="info">Customer only</Badge>}
            eyebrow="Checkout identity"
            title="Delivery details"
          >
            <div className="mt-6 grid gap-4">
              <Input
                disabled
                label="Name"
                placeholder="Buyer full name"
                value={form.name}
              />
              <Input
                disabled
                label="Email"
                placeholder="buyer@example.com"
                type="email"
                value={form.email}
              />
              <Input
                error={validationErrors.phone}
                label="Phone"
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+1 555 123 4567"
                value={form.phone}
              />
              <Textarea
                error={validationErrors.address}
                label="Address"
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                placeholder="Street, city, state, postal code"
                value={form.address}
              />
            </div>
          </Card>

          <Card title="Order recap">
            <div className="mt-4 space-y-3 text-sm text-slate">
              <div className="flex items-center justify-between">
                <span>Products subtotal</span>
                <strong className="text-ink">{currencyFormatter.format(cart.total)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <strong className="text-ink">{currencyFormatter.format(SHIPPING_COST)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment method</span>
                <strong className="text-ink">Cash on delivery</strong>
              </div>
              <div className="flex items-center justify-between border-t border-black/10 pt-3 text-base">
                <span className="font-semibold text-ink">Total</span>
                <strong className="font-display text-2xl text-ember">
                  {currencyFormatter.format(overallTotal)}
                </strong>
              </div>
            </div>

            {submitError ? (
              <p className="mt-4 text-sm font-semibold text-red-600" role="alert">
                {submitError}
              </p>
            ) : null}
            {submitMessage ? (
              <p className="mt-4 text-sm font-semibold text-green-700" role="status">
                {submitMessage}
              </p>
            ) : null}

            <Button
              className="mt-6 w-full"
              disabled={
                cart.items.length === 0 ||
                checkoutMutation.isPending ||
                cartQuery.isLoading
              }
              onClick={() => void handleConfirmOrder()}
              type="button"
            >
              {checkoutMutation.isPending ? "Confirming order..." : "Confirm COD order"}
            </Button>

            <p className="mt-4 text-xs leading-6 text-slate">
              The current backend will use your authenticated account for order ownership and
              email delivery. This form captures delivery details and maps them to the existing
              checkout contract.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
