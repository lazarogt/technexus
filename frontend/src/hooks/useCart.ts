import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import type { CartSummary } from "../lib/types";

export const cartQueryKey = (token: string) => ["cart", token] as const;

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`
});

export function useCart(token: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: cartQueryKey(token),
    queryFn: () =>
      apiRequest<CartSummary>("/cart", {
        headers: authHeaders(token)
      }),
    enabled: token.length > 0 && (options.enabled ?? true),
    staleTime: 10_000
  });
}

export function useAddToCart(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => {
      return apiRequest<CartSummary>("/cart", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          productId,
          quantity
        })
      });
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartQueryKey(token), cart);
    }
  });
}

export function useRemoveFromCart(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest<CartSummary>("/cart", {
        method: "DELETE",
        headers: authHeaders(token),
        body: JSON.stringify({ productId })
      });
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(cartQueryKey(token), cart);
    }
  });
}
