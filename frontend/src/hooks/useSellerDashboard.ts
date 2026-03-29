import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, buildQuerySuffix } from "../lib/api";
import type { OrderListResponse, OrderStatus, Product } from "../lib/types";

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`
});

export function useSellerProducts(token: string) {
  return useQuery({
    queryKey: ["seller-products", token],
    queryFn: () =>
      apiRequest<{ products: Product[] }>("/products/mine", {
        headers: authHeaders(token)
      }),
    enabled: token.length > 0,
    staleTime: 15_000
  });
}

export function useSellerOrders(token: string) {
  return useQuery({
    queryKey: ["seller-orders", token],
    queryFn: () =>
      apiRequest<OrderListResponse>(
        `/orders/seller${buildQuerySuffix({
          page: "1",
          limit: "200"
        })}`,
        {
          headers: authHeaders(token)
        }
      ),
    enabled: token.length > 0,
    staleTime: 15_000
  });
}

export function useCreateSellerProduct(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FormData) =>
      apiRequest<{ product: Product }>("/products", {
        method: "POST",
        headers: authHeaders(token),
        body: payload
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller-products", token] });
    }
  });
}

export function useUpdateSellerProduct(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: FormData }) =>
      apiRequest<{ product: Product }>(`/products/${productId}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: payload
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller-products", token] });
    }
  });
}

export function useDeleteSellerProduct(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) =>
      apiRequest<{ message: string }>(`/products/${productId}`, {
        method: "DELETE",
        headers: authHeaders(token)
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller-products", token] });
    }
  });
}

export function useUpdateSellerOrderStatus(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      apiRequest(`/orders/${orderId}/status`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller-orders", token] });
    }
  });
}
