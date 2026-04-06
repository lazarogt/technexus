import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryPage } from "@/pages/store/CategoryPage";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";

vi.mock("@/features/api/catalog-api", () => ({
  listCategories: vi.fn(),
  listProducts: vi.fn()
}));

vi.mock("@/features/cart/cart-context", () => ({
  useCart: vi.fn()
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-pathname">{location.pathname}</output>;
}

describe("CategoryPage", () => {
  beforeEach(() => {
    vi.mocked(useCart).mockReset();
    vi.mocked(listCategories).mockReset();
    vi.mocked(listProducts).mockReset();

    vi.mocked(useCart).mockReturnValue({
      addItem: vi.fn()
    } as never);

    vi.mocked(listCategories).mockResolvedValue({
      categories: [
        { id: "c1", name: "Laptops" },
        { id: "c2", name: "Accesorios" }
      ],
      pagination: { total: 2 }
    });

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
        }
      ],
      pagination: {
        page: 1,
        pageSize: 24,
        total: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false
      }
    });
  });

  it("redirects legacy category URLs to the canonical slug path and sets metadata", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/category/c1"]}>
            <Routes>
              <Route
                path="/category/:categoryParam"
                element={
                  <>
                    <CategoryPage />
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
      expect(vi.mocked(listCategories)).toHaveBeenCalled();
      expect(vi.mocked(listProducts)).toHaveBeenCalledWith({
        categoryId: "c1",
        sort: "latest",
        limit: 24
      });
      expect(screen.getByRole("heading", { name: "Laptops" })).toBeInTheDocument();
    }, { timeout: 5_000 });

    await waitFor(() => {
      expect(screen.getByTestId("location-pathname")).toHaveTextContent("/category/laptops-c1");
    }, { timeout: 5_000 });

    expect(document.title).toBe("Laptops | TechNexus");
    expect(document.head.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
      "http://localhost:3000/category/laptops-c1"
    );
  }, 15_000);
});
