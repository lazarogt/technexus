import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";
import { tokenStorageKey, type AuthResponse, type UserProfile, type UserRole } from "./types";
import { profileQueryKey, useProfile } from "../hooks/useProfile";

type AuthContextValue = {
  token: string;
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isProfileLoading: boolean;
  applyAuthResponse: (response: AuthResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const getStoredToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(tokenStorageKey) ?? "";
};

const persistToken = (token: string) => {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(tokenStorageKey, token);
    return;
  }

  window.localStorage.removeItem(tokenStorageKey);
};

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(getStoredToken);
  const profileQuery = useProfile(token);

  const clearSession = useCallback(() => {
    persistToken("");
    setToken("");
    queryClient.removeQueries({ queryKey: ["profile"] });
    queryClient.removeQueries({ queryKey: ["cart"] });
    queryClient.removeQueries({ queryKey: ["customer-orders"] });
    queryClient.removeQueries({ queryKey: ["seller-orders"] });
    queryClient.removeQueries({ queryKey: ["seller-products"] });
    queryClient.removeQueries({ queryKey: ["admin-ops"] });
    queryClient.removeQueries({ queryKey: ["admin-ops-worker"] });
  }, [queryClient]);

  const applyAuthResponse = useCallback(
    (response: AuthResponse) => {
      persistToken(response.token);
      setToken(response.token);
      queryClient.setQueryData(profileQueryKey(response.token), {
        user: response.user
      });
      queryClient.removeQueries({ queryKey: ["cart"] });
      queryClient.removeQueries({ queryKey: ["customer-orders"] });
      queryClient.removeQueries({ queryKey: ["seller-orders"] });
      queryClient.removeQueries({ queryKey: ["seller-products"] });
      queryClient.removeQueries({ queryKey: ["admin-ops"] });
      queryClient.removeQueries({ queryKey: ["admin-ops-worker"] });
    },
    [queryClient]
  );

  useEffect(() => {
    const syncToken = () => setToken(getStoredToken());

    window.addEventListener("storage", syncToken);
    return () => window.removeEventListener("storage", syncToken);
  }, []);

  useEffect(() => {
    const error = profileQuery.error;

    if (
      token &&
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      clearSession();
    }
  }, [clearSession, profileQuery.error, token]);

  const value = useMemo<AuthContextValue>(() => {
    const user = profileQuery.data?.user ?? null;

    return {
      token,
      user,
      role: user?.role ?? null,
      isAuthenticated: token.length > 0,
      isProfileLoading: token.length > 0 && profileQuery.isLoading,
      applyAuthResponse,
      logout: clearSession
    };
  }, [applyAuthResponse, clearSession, profileQuery.data?.user, profileQuery.isLoading, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useSession must be used within AuthProvider");
  }

  return context;
}
