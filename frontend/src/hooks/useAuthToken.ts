import { useSession } from "../lib/auth-context";

export function useAuthToken() {
  return useSession().token;
}
