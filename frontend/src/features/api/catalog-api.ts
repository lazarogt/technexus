import { apiFetch } from "@/features/api/http";
import type { Category, Product, ProductFilters, ProductListResponse, ProductPayload } from "@/features/api/types";

function toProductFormData(payload: ProductPayload) {
  const formData = new FormData();
  formData.set("name", payload.name);
  formData.set("description", payload.description);
  formData.set("price", String(payload.price));
  formData.set("stock", String(payload.stock));
  formData.set("categoryId", payload.categoryId);

  if (payload.sellerId) {
    formData.set("sellerId", payload.sellerId);
  }

  if (payload.imageUrls.length > 0) {
    formData.set("imageUrls", JSON.stringify(payload.imageUrls));
  }

  payload.files.forEach((file) => {
    formData.append("images", file);
  });

  return formData;
}

export function listProducts(filters: ProductFilters = {}) {
  return apiFetch<ProductListResponse>("/api/products", {
    searchParams: filters
  });
}

export function getProduct(id: string) {
  return apiFetch<{ product: Product }>(`/api/products/${id}`);
}

export function listSellerProducts(token: string, sellerId?: string) {
  return apiFetch<{ products: Product[] }>("/api/products/mine", {
    token,
    searchParams: sellerId ? { sellerId } : undefined
  });
}

export function createProduct(token: string, payload: ProductPayload) {
  return apiFetch<{ product: Product }>("/api/products", {
    method: "POST",
    token,
    body: toProductFormData(payload)
  });
}

export function updateProduct(token: string, productId: string, payload: ProductPayload) {
  return apiFetch<{ product: Product }>(`/api/products/${productId}`, {
    method: "PUT",
    token,
    body: toProductFormData(payload)
  });
}

export function deleteProduct(token: string, productId: string) {
  return apiFetch<{ message: string }>(`/api/products/${productId}`, {
    method: "DELETE",
    token
  });
}

export function listCategories() {
  return apiFetch<{ categories: Category[]; pagination: { total: number } }>("/api/categories");
}

export function createCategory(token: string, payload: { name: string }) {
  return apiFetch<{ category: Category }>("/api/categories", {
    method: "POST",
    token,
    body: payload
  });
}

export function updateCategory(token: string, categoryId: string, payload: { name: string }) {
  return apiFetch<{ category: Category }>(`/api/categories/${categoryId}`, {
    method: "PUT",
    token,
    body: payload
  });
}

export function deleteCategory(token: string, categoryId: string) {
  return apiFetch<{ message: string }>(`/api/categories/${categoryId}`, {
    method: "DELETE",
    token
  });
}
