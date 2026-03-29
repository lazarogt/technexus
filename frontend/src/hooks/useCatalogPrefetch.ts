import { useEffect } from "react";
import { preload } from "swr";
import { apiRequest } from "../lib/api";
import { catalogKeys } from "../lib/cacheKeys";
import type { CatalogSort, PaginationMeta, ProductListResponse } from "../lib/types";

type UseCatalogPrefetchInput = {
  enabled: boolean;
  pagination: PaginationMeta;
  categoryId: string;
  search: string;
  sort: CatalogSort;
  limit: number;
};

export const useCatalogPrefetch = (input: UseCatalogPrefetchInput) => {
  useEffect(() => {
    if (!input.enabled || !input.pagination.hasNextPage) {
      return;
    }

    const nextPageKey = catalogKeys.products({
      page: input.pagination.page + 1,
      limit: input.limit,
      categoryId: input.categoryId,
      search: input.search,
      sort: input.sort
    });

    void preload(nextPageKey, (path: string) =>
      apiRequest<ProductListResponse>(path, { method: "GET" })
    );
  }, [
    input.categoryId,
    input.enabled,
    input.limit,
    input.pagination.hasNextPage,
    input.pagination.page,
    input.search,
    input.sort
  ]);
};
