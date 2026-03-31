type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | Record<string, unknown> | null;
  token?: string;
  headers?: HeadersInit;
  searchParams?: Record<string, string | number | boolean | undefined | null>;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path: string, searchParams?: RequestOptions["searchParams"]) {
  const url = new URL(path.startsWith("http") ? path : `${window.location.origin}${path}`);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  if (path.startsWith("http")) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const isFormData = options.body instanceof FormData;

  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, options.searchParams), {
    method: options.method ?? "GET",
    headers,
    body:
      options.body && !isFormData && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : (options.body as BodyInit | null | undefined)
  });

  if (!response.ok) {
    let payload: { message?: string; error?: string; code?: string } | null = null;

    try {
      payload = (await response.json()) as { message?: string; error?: string; code?: string };
    } catch {
      payload = null;
    }

    throw new ApiError(
      payload?.message ?? payload?.error ?? "No se pudo completar la solicitud.",
      response.status,
      payload?.code
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
