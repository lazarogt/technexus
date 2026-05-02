import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { getProfile, createDemoSession, createGuestSession, login as loginRequest, register as registerRequest } from "@/features/api/auth-api";
import type { AuthResponse, GuestResponse, PublicUser, UserRole } from "@/features/api/types";
import { identify } from "@/features/analytics/analytics";
import { DEMO_MODE } from "@/demo/demo-env";
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
  applySession: (response: AuthResponse) => void;
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

function persistUserSession(response: AuthResponse): UserSession {
  const session: UserSession = {
    kind: "user",
    token: response.token,
    user: response.user
  };

  writeStorage(SESSION_KEY, session);
  return session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(() => readStorage<SessionState>(SESSION_KEY));
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    if (session?.kind === "user") {
      identify(session.user.id);
    }
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const current = readStorage<SessionState>(SESSION_KEY);

      if (!current) {
        if (DEMO_MODE) {
          try {
            const demoSession = await createDemoSession({ role: "customer" });

            if (!cancelled) {
              setSession(persistUserSession(demoSession));
              setIsBootstrapping(false);
            }
            return;
          } catch {
            // Fall through to unauthenticated state in demo mode when the API is unavailable.
          }
        }

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
      applySession(response) {
        setSession(persistUserSession(response));
      },
      async login(payload) {
        const response = await loginRequest(payload);
        setSession(persistUserSession(response));
        return response.user;
      },
      async register(payload) {
        const response = await registerRequest(payload);
        setSession(persistUserSession(response));
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
