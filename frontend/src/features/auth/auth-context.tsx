import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { getProfile, createGuestSession, login as loginRequest, register as registerRequest } from "@/features/api/auth-api";
import type { GuestResponse, PublicUser, UserRole } from "@/features/api/types";
import { removeStorage, readStorage, writeStorage } from "@/lib/storage";

type UserSession = {
  kind: "user";
  token: string;
  user: PublicUser;
};

type GuestSession = {
  kind: "guest";
  token: string;
  guestSessionId: string;
  expiresAt: string;
};

export type SessionState = UserSession | GuestSession | null;

type AuthContextValue = {
  session: SessionState;
  user: PublicUser | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: { email: string; password: string }) => Promise<PublicUser>;
  register: (payload: { name: string; email: string; password: string; role: "seller" | "customer" }) => Promise<PublicUser>;
  logout: () => void;
  ensureGuestSession: () => Promise<GuestSession>;
};

const SESSION_KEY = "session";

const AuthContext = createContext<AuthContextValue | null>(null);

function persistGuestSession(response: GuestResponse): GuestSession {
  const session: GuestSession = {
    kind: "guest",
    token: response.token,
    guestSessionId: response.guestSessionId,
    expiresAt: response.expiresAt
  };

  writeStorage(SESSION_KEY, session);
  return session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(() => readStorage<SessionState>(SESSION_KEY));
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const current = readStorage<SessionState>(SESSION_KEY);

      if (!current) {
        if (!cancelled) {
          setSession(null);
          setIsBootstrapping(false);
        }
        return;
      }

      if (current.kind === "guest") {
        if (new Date(current.expiresAt) > new Date()) {
          if (!cancelled) {
            setSession(current);
            setIsBootstrapping(false);
          }
          return;
        }

        removeStorage(SESSION_KEY);
        if (!cancelled) {
          setSession(null);
          setIsBootstrapping(false);
        }
        return;
      }

      try {
        const profile = await getProfile(current.token);

        if (cancelled) {
          return;
        }

        const nextSession: UserSession = {
          kind: "user",
          token: current.token,
          user: profile.user
        };

        writeStorage(SESSION_KEY, nextSession);
        setSession(nextSession);
      } catch {
        removeStorage(SESSION_KEY);
        if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.kind === "user" ? session.user : null,
      token: session?.token ?? null,
      role: session?.kind === "user" ? session.user.role : null,
      isAuthenticated: session?.kind === "user",
      isBootstrapping,
      async login(payload) {
        const response = await loginRequest(payload);
        const nextSession: UserSession = {
          kind: "user",
          token: response.token,
          user: response.user
        };
        writeStorage(SESSION_KEY, nextSession);
        setSession(nextSession);
        return response.user;
      },
      async register(payload) {
        const response = await registerRequest(payload);
        const nextSession: UserSession = {
          kind: "user",
          token: response.token,
          user: response.user
        };
        writeStorage(SESSION_KEY, nextSession);
        setSession(nextSession);
        return response.user;
      },
      logout() {
        removeStorage(SESSION_KEY);
        setSession(null);
      },
      async ensureGuestSession() {
        if (session?.kind === "guest" && new Date(session.expiresAt) > new Date()) {
          return session;
        }

        const response = await createGuestSession();
        const nextSession = persistGuestSession(response);
        setSession(nextSession);
        return nextSession;
      }
    }),
    [isBootstrapping, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
