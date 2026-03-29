const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const inferApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  if (window.location.hostname === "frontend") {
    return "http://backend:4000";
  }

  return `${window.location.protocol}//${window.location.hostname}:4000`;
};

export const apiBaseUrl = configuredApiBaseUrl || inferApiBaseUrl();

export const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "USD"
});

export const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short"
});

const isFormDataBody = (body: BodyInit | null | undefined): body is FormData => {
  return typeof FormData !== "undefined" && body instanceof FormData;
};

export const buildQuerySuffix = (
  entries: Record<string, string | null | undefined>
): string => {
  const searchParams = new URLSearchParams();

  Object.entries(entries).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      searchParams.set(key, value.trim());
    }
  });

  return searchParams.size > 0 ? `?${searchParams.toString()}` : "";
};

export const toAssetUrl = (imagePath: string): string => {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  return `${apiBaseUrl}${imagePath}`;
};

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && !isFormDataBody(options.body)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  });

  const data = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && data.message
        ? data.message
        : "Unexpected request error.";

    throw new ApiError(response.status, message);
  }

  return data as T;
}
