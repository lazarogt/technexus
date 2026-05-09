import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsEventPayload } from "@/features/analytics/analytics";
import { createInternalAnalyticsProvider } from "@/features/analytics/providers/internal";

const originalFetch = globalThis.fetch;

describe("internal analytics desktop routing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.technexusDesktop;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete window.technexusDesktop;
  });

  it("does not send HTTP analytics events in desktop mode", async () => {
    const fetchSpy = vi.fn();
    const trackAnalytics = vi.fn();
    globalThis.fetch = fetchSpy;
    window.technexusDesktop = {
      isDesktop: true,
      trackAnalytics
    };

    const payload: AnalyticsEventPayload = {
      event: "view_home",
      sessionId: "local-session",
      data: { source: "desktop" }
    };

    await createInternalAnalyticsProvider().track(payload);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(trackAnalytics).toHaveBeenCalledWith(payload);
  });
});
