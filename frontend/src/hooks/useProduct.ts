import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import type { Product } from "../lib/types";

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: () => apiRequest<{ product: Product }>(`/products/${productId}`),
    enabled: productId.length > 0,
    staleTime: 30_000
  });
}
