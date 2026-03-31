import { apiFetch } from "@/features/api/http";
import type { InventoryAlert, InventoryByProduct, InventoryRecord } from "@/features/api/types";

export function listInventoryAlerts(token: string) {
  return apiFetch<{ alerts: InventoryAlert[] }>("/api/inventory/alerts", {
    token
  });
}

export function getInventoryByProduct(token: string, productId: string) {
  return apiFetch<InventoryByProduct>(`/api/inventory/products/${productId}`, {
    token
  });
}

export function updateInventory(
  token: string,
  inventoryId: string,
  payload: {
    quantity?: number;
    lowStockThreshold?: number;
  }
) {
  return apiFetch<{ inventory: InventoryRecord }>(`/api/inventory/${inventoryId}`, {
    method: "PATCH",
    token,
    body: payload
  });
}
