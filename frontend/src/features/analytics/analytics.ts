import { readStorage, writeStorage } from "@/lib/storage";
import { createInternalAnalyticsProvider } from "./providers/internal";
import { createPosthogAnalyticsProvider } from "./providers/posthog";

export const analyticsEventNames = [
  "view_home",
  "view_product",
  "add_to_cart",
  "view_cart",
  "start_checkout",
  "complete_order"
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type AnalyticsPayloadData = Record<string, unknown>;
export type AnalyticsEventPayload = {
  event: AnalyticsEventName;
  sessionId: string;
  userId?: string;
  data?: AnalyticsPayloadData;
};

export type AnalyticsProvider = {
  track: (payload: AnalyticsEventPayload) => void | Promise<void>;
  identify: (userId: string) => void | Promise<void>;
};

type StoredSession =
  | {
      kind: "user";
      token: string;
      user: {
        id: string;
      };
    }
  | {
      kind: "guest";
      token: string;
      guestSessionId: string;
    }
  | null;

const ANALYTICS_SESSION_KEY = "analytics-session-id";
const identifiedUsers = new Set<string>();
const trackedKeys = new Set<string>();

let activeProvider: AnalyticsProvider | null | undefined;

function getEnvValue(key: "VITE_ANALYTICS_PROVIDER" | "VITE_POSTHOG_KEY" | "VITE_POSTHOG_HOST") {
  return typeof import.meta !== "undefined" ? import.meta.env[key] : undefined;
}

function logAnalyticsError(error: unknown) {
  if (typeof import.meta !== "undefined" && import.meta.env.DEV && import.meta.env.MODE !== "test") {
    console.debug("Analytics call failed silently", error);
  }
}

function getStoredSession() {
  return readStorage<StoredSession>("session");
}

function compactData(data?: AnalyticsPayloadData) {
  if (!data) {
    return undefined;
  }

  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function getProvider() {
  if (activeProvider !== undefined) {
    return activeProvider;
  }

  const providerName = getEnvValue("VITE_ANALYTICS_PROVIDER");

  if (providerName === "internal") {
    activeProvider = createInternalAnalyticsProvider();
    return activeProvider;
  }

  if (providerName === "posthog") {
    const key = getEnvValue("VITE_POSTHOG_KEY");
    const host = getEnvValue("VITE_POSTHOG_HOST");

    if (key && host) {
      activeProvider = createPosthogAnalyticsProvider({ key, host });
      return activeProvider;
    }
  }

  activeProvider = null;
  return activeProvider;
}

function callProvider(action: () => void | Promise<void>) {
  try {
    const result = action();

    if (result && typeof (result as Promise<void>).catch === "function") {
      void (result as Promise<void>).catch(logAnalyticsError);
    }
  } catch (error) {
    logAnalyticsError(error);
  }
}

export function getAnalyticsSessionId() {
  const current = readStorage<string>(ANALYTICS_SESSION_KEY);

  if (current) {
    return current;
  }

  const nextValue =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `session-${Date.now()}`;

  writeStorage(ANALYTICS_SESSION_KEY, nextValue);
  return nextValue;
}

export function track(event: AnalyticsEventName, data?: AnalyticsPayloadData): void {
  const provider = getProvider();

  if (!provider) {
    return;
  }

  const session = getStoredSession();
  const payload: AnalyticsEventPayload = {
    event,
    sessionId: getAnalyticsSessionId(),
    userId: session?.kind === "user" ? session.user.id : undefined,
    data: compactData(data)
  };

  callProvider(() => provider.track(payload));
}

export function trackOnce(key: string, event: AnalyticsEventName, data?: AnalyticsPayloadData): void {
  const uniqueKey = `${getAnalyticsSessionId()}:${key}`;

  if (trackedKeys.has(uniqueKey)) {
    return;
  }

  trackedKeys.add(uniqueKey);
  track(event, data);
}

export function identify(userId: string): void {
  if (!userId || identifiedUsers.has(userId)) {
    return;
  }

  const provider = getProvider();

  if (!provider) {
    return;
  }

  identifiedUsers.add(userId);
  callProvider(() => provider.identify(userId));
}

export function resetAnalyticsForTests() {
  activeProvider = undefined;
  identifiedUsers.clear();
  trackedKeys.clear();
}
