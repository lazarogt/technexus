import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "@/components/store/layout/Header";
import { useAuth } from "@/features/auth/auth-context";
import { useCart } from "@/features/cart/cart-context";

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: vi.fn()
}));

vi.mock("@/features/cart/cart-context", () => ({
  useCart: vi.fn()
}));

describe("Header", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      role: "customer",
      user: { id: "user-1", name: "Alex Johnson", email: "alex@example.com", role: "customer", isBlocked: false, createdAt: "2026-01-01T00:00:00.000Z" },
      logout: vi.fn(),
      token: "token",
      session: { kind: "user", token: "token", user: { id: "user-1", name: "Alex Johnson", email: "alex@example.com", role: "customer", isBlocked: false, createdAt: "2026-01-01T00:00:00.000Z" } },
      ensureGuestSession: vi.fn()
    } as never);

    vi.mocked(useCart).mockReturnValue({
      cart: { items: [], total: 0 },
      isLoading: false,
      lastAddedItem: null,
      cartAttentionTick: 0,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      refreshCart: vi.fn(),
      checkout: vi.fn()
    });
  });

  it("keeps search visible and exposes account, orders and cart actions", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByTestId("store-search-input")).toBeVisible();
    expect(screen.getByRole("link", { name: /alex/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pedidos" })).toBeInTheDocument();
    expect(screen.getByTestId("cart-trigger")).toBeInTheDocument();
  });
});
