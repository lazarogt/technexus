import { useInfiniteQuery } from "@tanstack/react-query";
import { buildQuerySuffix, apiRequest } from "../lib/api";
import {
  useMarketplaceFilters,
  type PriceBucket,
  type RatingFilter
} from "../lib/marketplace-context";
import type { Product, ProductListResponse } from "../lib/types";

const PAGE_SIZE = 24;

const getVirtualRating = (product: Product): number => {
  const seed = product.id.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return 3 + (seed % 20) / 10;
};

const matchesPriceBucket = (price: number, bucket: PriceBucket): boolean => {
  switch (bucket) {
    case "under-50":
      return price < 50;
    case "50-250":
      return price >= 50 && price < 250;
    case "250-1000":
      return price >= 250 && price < 1000;
    case "1000-plus":
      return price >= 1000;
    default:
      return true;
  }
};

const matchesRating = (product: Product, ratingFilter: RatingFilter): boolean => {
  const rating = getVirtualRating(product);

  if (ratingFilter === "4-up") {
    return rating >= 4;
  }

  if (ratingFilter === "3-up") {
    return rating >= 3;
  }

  return true;
};

export function useProducts() {
  const filters = useMarketplaceFilters();

  const query = useInfiniteQuery({
    queryKey: [
      "products",
      filters.searchQuery,
      filters.categoryId,
      filters.sort
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<ProductListResponse> => {
      return apiRequest<ProductListResponse>(
        `/products${buildQuerySuffix({
          page: String(pageParam),
          limit: String(PAGE_SIZE),
          categoryId: filters.categoryId || null,
          search: filters.searchQuery || null,
          sort: filters.sort
        })}`
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined
  });

  const pages = query.data?.pages ?? [];
  const allProducts = pages.flatMap((page) => page.products);
  const sellerOptions = Array.from(
    new Map(allProducts.map((product) => [product.sellerId, product.sellerName])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filteredProducts = allProducts.filter((product) => {
    if (filters.sellerId && product.sellerId !== filters.sellerId) {
      return false;
    }

    if (!matchesPriceBucket(product.price, filters.priceBucket)) {
      return false;
    }

    if (!matchesRating(product, filters.ratingFilter)) {
      return false;
    }

    if (filters.inStockOnly && product.stock <= 0) {
      return false;
    }

    return true;
  });

  return {
    ...query,
    products: filteredProducts,
    allProducts,
    sellerOptions,
    totalProducts: pages[0]?.pagination.total ?? 0,
    totalPages: pages[0]?.pagination.totalPages ?? 1
  };
}
