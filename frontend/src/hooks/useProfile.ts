import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import type { UserProfile } from "../lib/types";

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`
});

export const profileQueryKey = (token: string) => ["profile", token] as const;

export function useProfile(token: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: profileQueryKey(token),
    queryFn: () =>
      apiRequest<{ user: UserProfile }>("/profile", {
        headers: authHeaders(token)
      }),
    enabled: token.length > 0 && (options.enabled ?? true),
    staleTime: 30_000
  });
}
