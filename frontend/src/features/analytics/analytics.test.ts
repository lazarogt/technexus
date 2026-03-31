import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readStorage, removeStorage, writeStorage } from "@/lib/storage";

const originalSendBeacon = navigator.sendBeacon;
const originalFetch = global.fetch;

function createUserSession(userId = "user-1", token = "token-1") {
  writeStorage("session", {
    kind: "user",
    token,
    user: {
      id: userId
    }
  });
}

describe("analytics runtime", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  afterEach(() => {
    navigator.sendBeacon = originalSendBeacon;
    global.fetch = originalFetch;
  });

  it("creates and reuses a stable analytics session id", async () => {
    vi.stubEnv("VITE_ANALYTICS_PROVIDER", "internal");
    const analytics = await import("./analytics");

    const first = analytics.getAnalyticsSessionId();
    const second = analytics.getAnalyticsSessionId();

    expect(first).toBe(second);
    expect(readStorage<string>("analytics-session-id")).toBe(first);
  });

  it("falls back to a silent no-op provider when analytics env is missing", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as typeof fetch;

    const analytics = await import("./analytics");

    expect(() => analytics.track("view_home")).not.toThrow();
    expect(() => analytics.identify("user-1")).not.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses sendBeacon in internal mode when no auth token is available", async () => {
    vi.stubEnv("VITE_ANALYTICS_PROVIDER", "internal");
    const sendBeacon = vi.fn().mockReturnValue(true);
    const fetchSpy = vi.fn();
    navigator.sendBeacon = sendBeacon;
    global.fetch = fetchSpy as typeof fetch;

    const analytics = await import("./analytics");

    analytics.track("view_home");

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to fetch keepalive when sendBeacon is unavailable or auth exists", async () => {
    vi.stubEnv("VITE_ANALYTICS_PROVIDER", "internal");
    navigator.sendBeacon = undefined as unknown as typeof navigator.sendBeacon;
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    global.fetch = fetchSpy as typeof fetch;
    createUserSession("user-42", "secure-token");

    const analytics = await import("./analytics");

    analytics.track("view_cart", { items: 2 });
    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/analytics",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        headers: expect.any(Headers)
      })
    );

    const requestHeaders = fetchSpy.mock.calls[0][1]?.headers as Headers;
    expect(requestHeaders.get("Authorization")).toBe("Bearer secure-token");
  });

  it("swallows provider transport failures and identifies authenticated users once", async () => {
    vi.stubEnv("VITE_ANALYTICS_PROVIDER", "internal");
    navigator.sendBeacon = undefined as unknown as typeof navigator.sendBeacon;
    const fetchSpy = vi.fn().mockRejectedValue(new Error("network failed"));
    global.fetch = fetchSpy as typeof fetch;
    createUserSession("user-77", "token-77");

    const analytics = await import("./analytics");

    expect(() => analytics.track("view_product", { productId: "product-1" })).not.toThrow();
    expect(() => analytics.identify("user-77")).not.toThrow();
    expect(() => analytics.identify("user-77")).not.toThrow();

    await Promise.resolve();
    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    removeStorage("session");
  });
});
