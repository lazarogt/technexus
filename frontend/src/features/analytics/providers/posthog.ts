import posthog from "posthog-js";
import type { AnalyticsEventPayload, AnalyticsProvider } from "../analytics";

type PosthogConfig = {
  key: string;
  host: string;
};

let isInitialized = false;

function ensurePosthog(config: PosthogConfig) {
  if (isInitialized || typeof window === "undefined") {
    return;
  }

  posthog.init(config.key, {
    api_host: config.host,
    capture_pageview: false,
    persistence: "localStorage"
  });
  isInitialized = true;
}

export function createPosthogAnalyticsProvider(config: PosthogConfig): AnalyticsProvider {
  return {
    track(payload: AnalyticsEventPayload) {
      ensurePosthog(config);
      posthog.capture(payload.event, {
        sessionId: payload.sessionId,
        userId: payload.userId,
        ...payload.data
      });
    },
    identify(userId: string) {
      ensurePosthog(config);
      posthog.identify(userId);
    }
  };
}
