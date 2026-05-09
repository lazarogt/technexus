import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { CheckoutPage } from "./CheckoutPage";

const checkoutMock = vi.fn();

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false
  })
}));

vi.mock("@/features/cart/cart-context", () => ({
  useCart: () => ({
    cart: {
      total: 100,
      items: [
        {
          id: "cart-item-1",
          productId: "product-1",
          quantity: 2,
          productName: "Laptop Pro",
          productStock: 1,
          subtotal: 100
        }
      ]
    },
    checkout: checkoutMock
  })
}));

vi.mock("@/features/analytics/analytics", () => ({
  track: vi.fn(),
  trackOnce: vi.fn()
}));

function renderCheckout() {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <CheckoutPage />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe("CheckoutPage", () => {
  it("blocks checkout when a cart item exceeds available stock", async () => {
    renderCheckout();

    await userEvent.type(screen.getByLabelText(/nombre/i), "Buyer One");
    await userEvent.type(screen.getByLabelText(/correo/i), "buyer@example.com");
    await userEvent.type(screen.getByLabelText(/dirección/i), "742 Evergreen Terrace");
    await userEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByText(/superan el inventario disponible/i)).toBeInTheDocument();
    expect(checkoutMock).not.toHaveBeenCalled();
  });
});
