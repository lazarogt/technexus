/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_SITEMAP_API_URL?: string;
  readonly VITE_ANALYTICS_PROVIDER?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type TechnexusDesktopRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | Record<string, unknown> | null;
  token?: string;
  headers?: Record<string, string>;
  searchParams?: Record<string, string | number | boolean | undefined | null>;
};

interface Window {
  technexusDesktop?: {
    isDesktop?: boolean;
    request?: <T>(path: string, options?: TechnexusDesktopRequestOptions) => Promise<T>;
    trackAnalytics?: (payload: unknown) => Promise<void> | void;
  };
}
