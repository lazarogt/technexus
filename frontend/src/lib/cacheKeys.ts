import type { CatalogSort } from "./types";

export const catalogKeys = {
  categories(limit = 50) {
    return `/categories?page=1&limit=${limit}`;
  },
  products(input: {
    page: number;
    limit: number;
    categoryId: string;
    search: string;
    sort: CatalogSort;
  }) {
    const params = new URLSearchParams({
      page: String(input.page),
      limit: String(input.limit),
      sort: input.sort
    });

    if (input.categoryId.trim()) {
      params.set("category", input.categoryId.trim());
    }

    if (input.search.trim()) {
      params.set("search", input.search.trim());
    }

    return `/products?${params.toString()}`;
  }
};
