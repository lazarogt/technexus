import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "@/pages/store/HomePage";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";

vi.mock("@/features/api/catalog-api", () => ({
  listProducts: vi.fn(),
  listCategories: vi.fn()
}));

vi.mock("@/features/cart/cart-context", () => ({
  useCart: vi.fn()
}));

vi.mock("@/features/analytics/analytics", () => ({
  trackOnce: vi.fn()
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(useCart).mockReset();
    vi.mocked(listProducts).mockReset();
    vi.mocked(listCategories).mockReset();

    vi.mocked(useCart).mockReturnValue({
      addItem: vi.fn()
    } as never);

    vi.mocked(listProducts).mockResolvedValue({
      products: [
        {
          id: "p1",
          name: "Dell XPS 13",
          description: "Thin and light laptop",
          price: 1299,
          stock: 7,
          categoryId: "c1",
          categoryName: "Laptops",
          sellerId: "s1",
          sellerName: "TechZone",
          averageRating: 4.8,
          reviewCount: 54,
          images: ["/uploads/xps.jpg"]
        },
        {
          id: "p2",
          name: "LG UltraGear 27",
          description: "High refresh gaming monitor",
          price: 499,
          stock: 20,
          categoryId: "c2",
          categoryName: "Monitors",
          sellerId: "s2",
          sellerName: "EliteHardware",
          averageRating: 4.7,
          reviewCount: 22,
          images: ["/uploads/lg.jpg"]
        }
      ],
      pagination: {
        page: 1,
        pageSize: 24,
        total: 2,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false
      }
    });

    vi.mocked(listCategories).mockResolvedValue({
      categories: [
        { id: "c1", name: "Laptops" },
        { id: "c2", name: "Monitors" },
        { id: "c3", name: "Accessories" }
      ],
      pagination: { total: 3 }
    });
  });

  it("renders hero, trending, deals, top sellers and the main catalog", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("Dell XPS 13").length).toBeGreaterThan(0);
    });

    expect(screen.getByRole("link", { name: "Comprar ahora" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Productos en tendencia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ofertas que vale la pena aprovechar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vendedores destacados" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Explora el catálogo completo" })).toBeInTheDocument();
    expect(screen.getAllByText("Dell XPS 13").length).toBeGreaterThan(0);
  }, 10_000);
});
