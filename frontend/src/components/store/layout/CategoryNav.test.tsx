import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryNav } from "@/components/store/layout/CategoryNav";
import { listCategories } from "@/features/api/catalog-api";

vi.mock("@/features/api/catalog-api", () => ({
  listCategories: vi.fn()
}));

describe("CategoryNav", () => {
  beforeEach(() => {
    vi.mocked(listCategories).mockReset();

    vi.mocked(listCategories).mockResolvedValue({
      categories: [
        { id: "3", name: "Accessories" },
        { id: "1", name: "Laptops" },
        { id: "4", name: "Gaming" },
        { id: "2", name: "PC Components" }
      ],
      pagination: { total: 4 }
    });
  });

  it("renders dynamic categories with storefront ordering", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CategoryNav />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Laptops")).toBeInTheDocument();
    });

    const labels = screen.getAllByRole("link").map((link) => link.textContent);
    expect(labels.slice(0, 4)).toEqual(["Todos los departamentos", "Laptops", "PC Components", "Accessories"]);
  });
});
