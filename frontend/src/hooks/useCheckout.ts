import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import type { CartSummary, CheckoutPayload, CheckoutResponse } from "../lib/types";

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`
});

export function useCheckout(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CheckoutPayload) =>
      apiRequest<CheckoutResponse>("/checkout", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      queryClient.setQueryData<CartSummary | undefined>(["cart", token], {
        items: [],
        total: 0
      });
    }
  });
}
