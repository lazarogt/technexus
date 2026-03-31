import { apiFetch } from "@/features/api/http";
import type { OutboxOverview, PublicUser, UserListResponse } from "@/features/api/types";

export function listUsers(
  token: string,
  filters: {
    page?: number;
    limit?: number;
    role?: "admin" | "seller" | "customer";
  } = {}
) {
  return apiFetch<UserListResponse>("/api/users", {
    token,
    searchParams: filters
  });
}

export function createUser(
  token: string,
  payload: {
    name: string;
    email: string;
    password: string;
    role: "admin" | "seller" | "customer";
  }
) {
  return apiFetch<{ user: PublicUser }>("/api/users", {
    method: "POST",
    token,
    body: payload
  });
}

export function updateUser(
  token: string,
  userId: string,
  payload: {
    name?: string;
    email?: string;
    role?: "admin" | "seller" | "customer";
    isBlocked?: boolean;
  }
) {
  return apiFetch<{ user: PublicUser }>(`/api/users/${userId}`, {
    method: "PATCH",
    token,
    body: payload
  });
}

export function deleteUser(token: string, userId: string) {
  return apiFetch<{ message: string }>(`/api/users/${userId}`, {
    method: "DELETE",
    token
  });
}

export function getOutboxOverview(token: string, status?: "pending" | "sent" | "failed") {
  return apiFetch<OutboxOverview>("/api/orders/admin/outbox", {
    token,
    searchParams: status ? { status } : undefined
  });
}

export function retryFailedOutbox(token: string) {
  return apiFetch<{ updated: number }>("/api/orders/admin/outbox/retry-failed", {
    method: "POST",
    token
  });
}

export function retryOutboxRow(token: string, rowId: string) {
  return apiFetch<{ result: string }>(`/api/orders/admin/outbox/${rowId}/retry`, {
    method: "POST",
    token
  });
}

export function resetFailedOutbox(token: string, rowId: string) {
  return apiFetch<{ result: string }>(`/api/orders/admin/outbox/${rowId}/reset-failed`, {
    method: "POST",
    token
  });
}
