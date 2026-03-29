import { useQuery } from "@tanstack/react-query";
import { apiRequest, buildQuerySuffix } from "../lib/api";
import type { Category, CategoryListResponse } from "../lib/types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories", "marketplace"],
    queryFn: async (): Promise<Category[]> => {
      const response = await apiRequest<CategoryListResponse>(
        `/categories${buildQuerySuffix({ page: "1", limit: "100" })}`
      );

      return response.categories;
    },
    staleTime: 5 * 60_000
  });
}
