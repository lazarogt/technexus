import { apiFetch } from "@/features/api/http";
import type { CartSummary } from "@/features/api/types";

export function getCart(token: string) {
  return apiFetch<CartSummary>("/api/cart", { token });
}

export function addCartItem(token: string, payload: { productId: string; quantity: number }) {
  return apiFetch<CartSummary>("/api/cart", {
    method: "POST",
    token,
    body: payload
  });
}

export function removeCartItem(token: string, productId: string) {
  return apiFetch<CartSummary>("/api/cart", {
    method: "DELETE",
    token,
    body: { productId }
  });
}
