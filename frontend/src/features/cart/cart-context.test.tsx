import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "@/app/providers";
import { useAuth } from "@/features/auth/auth-context";
import { useCart } from "@/features/cart/cart-context";

function Consumer() {
  const { session } = useAuth();
  const { cart, addItem } = useCart();

  return (
    <div>
      <span data-testid="session-kind">{session?.kind ?? "none"}</span>
      <span data-testid="cart-count">{cart.items.length}</span>
      <button type="button" onClick={() => addItem("product-1", 2)}>
        add
      </button>
    </div>
  );
}

function createJsonResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => payload
  } as Response;
}

describe("CartProvider", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("hydrates guest cart and sends bearer token on add-to-cart", async () => {
    window.localStorage.setItem(
      "technexus:session",
      JSON.stringify({
        kind: "guest",
        token: "guest-token",
        guestSessionId: "guest-123",
        expiresAt: "2099-01-01T00:00:00.000Z"
      })
    );

    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);

      if (url.endsWith("/api/cart") && (!init?.method || init.method === "GET")) {
        expect(headers.get("Authorization")).toBe("Bearer guest-token");

        return createJsonResponse({
          items: [],
          total: 0
        });
      }

      if (url.endsWith("/api/cart") && init?.method === "POST") {
        expect(headers.get("Authorization")).toBe("Bearer guest-token");

        return createJsonResponse({
          items: [
            {
              id: "item-1",
              productId: "product-1",
              quantity: 2,
              productName: "Laptop",
              productDescription: "Ultrabook",
              productPrice: 1000,
              productStock: 3,
              productImages: ["/uploads/laptop.png"],
              categoryId: "cat-1",
              categoryName: "Computo",
              sellerId: "seller-1",
              sellerName: "Seller",
              subtotal: 2000
            }
          ],
          total: 2000
        });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    }) as typeof fetch;

    render(
      <AppProviders>
        <Consumer />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId("session-kind")).toHaveTextContent("guest");
    });

    await userEvent.click(screen.getByRole("button", { name: "add" }));

    await waitFor(() => {
      expect(screen.getByTestId("cart-count")).toHaveTextContent("1");
    });
  });
});
