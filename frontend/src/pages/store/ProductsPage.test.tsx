import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsPage } from "@/pages/store/ProductsPage";
import { listCategories, listProducts } from "@/features/api/catalog-api";
import { useCart } from "@/features/cart/cart-context";

vi.mock("@/features/api/catalog-api", () => ({
  listProducts: vi.fn(),
  listCategories: vi.fn()
}));

vi.mock("@/features/cart/cart-context", () => ({
  useCart: vi.fn()
}));

const CATEGORIES = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Portatiles" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Accesorios" }
];

function createProduct(id: string, name: string, categoryId: string, categoryName: string) {
  return {
    id,
    name,
    description: `${name} description`,
    price: 199,
    stock: 8,
    categoryId,
    categoryName,
    sellerId: "seller-1",
    sellerName: "TechNexus Store",
    averageRating: 4.5,
    reviewCount: 12,
    images: [`/uploads/${id}.jpg`]
  };
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderPage(initialEntry = "/products") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/products"
            element={
              <>
                <ProductsPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ProductsPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(useCart).mockReset();
    vi.mocked(listProducts).mockReset();
    vi.mocked(listCategories).mockReset();

    vi.mocked(useCart).mockReturnValue({
      addItem: vi.fn()
    } as never);

    vi.mocked(listCategories).mockResolvedValue({
      categories: CATEGORIES,
      pagination: { total: CATEGORIES.length }
    });

    vi.mocked(listProducts).mockImplementation(async (filters) => {
      const allProducts = [
        createProduct("p-1", "Laptop Pro", CATEGORIES[0].id, CATEGORIES[0].name),
        createProduct("p-2", "Mouse Pad", CATEGORIES[1].id, CATEGORIES[1].name)
      ];
      const products = filters?.categoryId
        ? allProducts.filter((product) => product.categoryId === filters.categoryId)
        : allProducts;

      return {
        products,
        pagination: {
          page: filters?.page ?? 1,
          pageSize: filters?.limit ?? 12,
          total: products.length,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false
        }
      };
    });
  });

  it("uses category IDs for translated category chip filters", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Laptop Pro")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Accesorios" }));

    await waitFor(() => {
      expect(vi.mocked(listProducts)).toHaveBeenLastCalledWith({
        page: 1,
        limit: 12,
        search: "",
        sort: "latest",
        categoryId: CATEGORIES[1].id
      });
    });

    expect(
      vi
        .mocked(listProducts)
        .mock.calls.some(([filters]) => filters?.categoryId === CATEGORIES[1].name)
    ).toBe(false);
    expect(screen.getByText("Mouse Pad")).toBeInTheDocument();
    expect(screen.queryByText("Laptop Pro")).not.toBeInTheDocument();
  });

  it("switches category filters by ID and clears back to all products", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Laptop Pro")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Accesorios" }));
    await waitFor(() => {
      expect(screen.getByText("Mouse Pad")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Portatiles" }));
    await waitFor(() => {
      expect(vi.mocked(listProducts)).toHaveBeenLastCalledWith({
        page: 1,
        limit: 12,
        search: "",
        sort: "latest",
        categoryId: CATEGORIES[0].id
      });
    });

    expect(screen.getByText("Laptop Pro")).toBeInTheDocument();
    expect(screen.queryByText("Mouse Pad")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todas" }));
    await waitFor(() => {
      expect(vi.mocked(listProducts)).toHaveBeenLastCalledWith({
        page: 1,
        limit: 12,
        search: "",
        sort: "latest",
        categoryId: undefined
      });
    });

    expect(screen.getByText("Laptop Pro")).toBeInTheDocument();
    expect(screen.getByText("Mouse Pad")).toBeInTheDocument();
    expect(screen.getByTestId("location-search")).toHaveTextContent("?page=1");
  });

  it("normalizes legacy category query values to categoryId before loading products", async () => {
    renderPage("/products?category=Portatiles");

    await waitFor(() => {
      expect(vi.mocked(listProducts)).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        search: "",
        sort: "latest",
        categoryId: CATEGORIES[0].id
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toHaveTextContent(
        `?categoryId=${CATEGORIES[0].id}`
      );
    });
    expect(screen.getByText("Laptop Pro")).toBeInTheDocument();
    expect(screen.queryByText("Mouse Pad")).not.toBeInTheDocument();
  });
});
