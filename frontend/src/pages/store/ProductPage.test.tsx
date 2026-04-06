import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductPage } from "@/pages/store/ProductPage";
import { getProduct, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";

vi.mock("@/features/api/catalog-api", () => ({
  getProduct: vi.fn(),
  listProducts: vi.fn()
}));

vi.mock("@/features/cart/cart-context", () => ({
  useCart: vi.fn()
}));

vi.mock("@/features/analytics/analytics", () => ({
  trackOnce: vi.fn()
}));

function createProduct(id: string, name: string, categoryId = "c1", sellerId = "s1") {
  return {
    id,
    name,
    description: `${name} description`,
    price: 999,
    stock: 12,
    categoryId,
    categoryName: categoryId === "c1" ? "Laptops" : "Accessories",
    sellerId,
    sellerName: sellerId === "s1" ? "TechZone" : "EliteHardware",
    averageRating: 4.7,
    reviewCount: 24,
    images: [`/uploads/${id}.jpg`]
  };
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-pathname">{location.pathname}</output>;
}

describe("ProductPage", () => {
  beforeEach(() => {
    vi.mocked(useCart).mockReset();
    vi.mocked(getProduct).mockReset();
    vi.mocked(listProducts).mockReset();

    vi.mocked(useCart).mockReturnValue({
      addItem: vi.fn()
    } as never);

    vi.mocked(getProduct).mockResolvedValue({
      product: {
        ...createProduct("p1", "Dell XPS 13"),
        reviews: [
          {
            id: "r1",
            userName: "Taylor",
            rating: 5,
            comment: "Excellent daily driver.",
            createdAt: "2026-03-15T10:00:00.000Z"
          }
        ]
      }
    });

    vi.mocked(listProducts).mockImplementation(async (filters) => {
      if (filters?.categoryId) {
        return {
          products: [
            createProduct("p2", "MacBook Air M2", "c1", "s2"),
            createProduct("p3", "ASUS ROG Zephyrus G14", "c1", "s3")
          ],
          pagination: {
            page: 1,
            pageSize: 10,
            total: 2,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false
          }
        };
      }

      return {
        products: [
          createProduct("p2", "MacBook Air M2", "c1", "s2"),
          createProduct("p3", "ASUS ROG Zephyrus G14", "c1", "s3"),
          createProduct("p4", "Logitech MX Master 3", "c2", "s4"),
          createProduct("p5", "LG UltraGear 27", "c3", "s2")
        ],
        pagination: {
          page: 1,
          pageSize: 18,
          total: 4,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        }
      };
    });
  });

  it("renders reviews, related products and customers also bought", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/product/p1"]}>
            <Routes>
              <Route
                path="/product/:productParam"
                element={
                  <>
                    <ProductPage />
                    <LocationProbe />
                  </>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Dell XPS 13" })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Reseñas de clientes" })).toBeInTheDocument();
    expect(screen.getByText("Excellent daily driver.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Productos relacionados" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Los clientes también compraron" })).toBeInTheDocument();
    expect(screen.getByTestId("mobile-buybar")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("location-pathname")).toHaveTextContent("/product/dell-xps-13-p1");
    }, { timeout: 5_000 });
    expect(document.title).toBe("Dell XPS 13");
    expect(document.head.querySelector("meta[property='og:title']")?.getAttribute("content")).toBe("Dell XPS 13");
    expect(document.head.querySelector("meta[property='og:image']")?.getAttribute("content")).toBe(
      "http://localhost:3000/uploads/p1.jpg"
    );
    await waitFor(() => {
      expect(document.querySelector("script[type='application/ld+json']")?.textContent ?? "").toContain(
        '"@type":"Product"'
      );
    }, { timeout: 5_000 });
  }, 15_000);
});
