import { ApiError } from "@/features/api/api-error";
import type { RequestOptions } from "@/features/api/http";

export const OFFLINE_MODE_MESSAGE = "Modo sin conexión activo";

export type DesktopRequestOptions = Omit<RequestOptions, "body" | "headers"> & {
  body?: RequestOptions["body"];
  headers?: Record<string, string>;
};

type DesktopBridge = {
  isDesktop?: boolean;
  request?: <T>(path: string, options?: DesktopRequestOptions) => Promise<T>;
  trackAnalytics?: (payload: unknown) => Promise<void> | void;
};

function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.technexusDesktop ?? null;
}

export function isDesktopRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  const bridge = getDesktopBridge();

  if (bridge?.isDesktop === true || typeof bridge?.request === "function") {
    return true;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  return window.location.protocol === "file:" || userAgent.includes(" electron/");
}

function headersToRecord(headers?: HeadersInit) {
  const normalized = new Headers(headers);
  return Object.fromEntries(normalized.entries());
}

export function toDesktopRequestOptions(options: RequestOptions): DesktopRequestOptions {
  return {
    method: options.method,
    body: options.body,
    token: options.token,
    headers: headersToRecord(options.headers),
    searchParams: options.searchParams
  };
}

export async function desktopRequest<T>(path: string, options: RequestOptions = {}) {
  const bridge = getDesktopBridge();

  if (typeof bridge?.request !== "function") {
    throw new ApiError(OFFLINE_MODE_MESSAGE, 0, "OFFLINE_DESKTOP_BRIDGE_UNAVAILABLE");
  }

  try {
    return await bridge.request<T>(path, toDesktopRequestOptions(options));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const message = error instanceof Error && error.message.trim() ? error.message : OFFLINE_MODE_MESSAGE;
    throw new ApiError(message, 0, "OFFLINE_DESKTOP_REQUEST_FAILED");
  }
}

export function trackDesktopAnalytics(payload: unknown) {
  const bridge = getDesktopBridge();

  if (typeof bridge?.trackAnalytics !== "function") {
    return;
  }

  return bridge.trackAnalytics(payload);
}
