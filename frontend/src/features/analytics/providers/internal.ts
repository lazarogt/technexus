import { readStorage } from "@/lib/storage";
import type { AnalyticsEventPayload, AnalyticsProvider } from "../analytics";

type StoredSession = {
  token?: string;
};

function getAuthToken() {
  const session = readStorage<StoredSession>("session");
  return typeof session?.token === "string" ? session.token : null;
}

function getHeaders(token: string | null) {
  const headers = new Headers({
    "Content-Type": "application/json"
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export function createInternalAnalyticsProvider(endpoint = "/api/analytics"): AnalyticsProvider {
  return {
    async track(payload: AnalyticsEventPayload) {
      const body = JSON.stringify(payload);
      const token = getAuthToken();

      if (!token && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const accepted = navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));

        if (accepted) {
          return;
        }
      }

      await fetch(endpoint, {
        method: "POST",
        headers: getHeaders(token),
        body,
        keepalive: true
      });
    },
    identify() {}
  };
}
