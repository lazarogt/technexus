import { apiFetch } from "@/features/api/http";
import type { AuthResponse, GuestResponse, PublicUser, UserRole } from "@/features/api/types";

export function login(payload: { email: string; password: string }) {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: payload
  });
}

export function register(payload: {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "admin">;
}) {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: payload
  });
}

export function createGuestSession() {
  return apiFetch<GuestResponse>("/api/auth/guest", {
    method: "POST"
  });
}

export function getProfile(token: string) {
  return apiFetch<{ user: PublicUser }>("/api/auth/profile", {
    token
  });
}
