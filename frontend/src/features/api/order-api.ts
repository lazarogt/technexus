import { apiFetch } from "@/features/api/http";
import type { OrderListResponse, OrderRecord, OrderStatus } from "@/features/api/types";

export function checkout(
  token: string,
  payload: {
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
    shippingAddress?: string;
    shippingCost?: number;
  }
) {
  return apiFetch<{ message: string; order: OrderRecord }>("/api/orders", {
    method: "POST",
    token,
    body: payload
  });
}

export function listOrders(
  token: string,
  filters: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    sellerId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
) {
  return apiFetch<OrderListResponse>("/api/orders", {
    token,
    searchParams: filters
  });
}

export function listSellerOrders(
  token: string,
  filters: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    sellerId?: string;
  } = {}
) {
  return apiFetch<OrderListResponse>("/api/orders/seller", {
    token,
    searchParams: filters
  });
}

export function updateOrderStatus(token: string, orderId: string, status: OrderStatus) {
  return apiFetch<{ order: OrderRecord }>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    token,
    body: { status }
  });
}
