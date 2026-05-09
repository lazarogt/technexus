import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/features/api/http";

const originalFetch = globalThis.fetch;

describe("apiFetch desktop routing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.technexusDesktop;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete window.technexusDesktop;
  });

  it("routes desktop requests through the preload IPC bridge without fetch", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    const request = vi.fn().mockResolvedValue({ ok: true });
    window.technexusDesktop = {
      isDesktop: true,
      request
    };

    await expect(
      apiFetch("/api/products", {
        method: "POST",
        token: "local-token",
        headers: { "X-Trace-Id": "trace-1" },
        searchParams: { page: 2 },
        body: { name: "Producto" }
      })
    ).resolves.toEqual({ ok: true });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith("/api/products", {
      method: "POST",
      token: "local-token",
      headers: { "x-trace-id": "trace-1" },
      searchParams: { page: 2 },
      body: { name: "Producto" }
    });
  });

  it("returns a friendly offline message instead of a network request when desktop IPC is unavailable", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    window.technexusDesktop = {
      isDesktop: true
    };

    await expect(apiFetch("/api/products")).rejects.toMatchObject({
      message: "Modo sin conexión activo",
      status: 0,
      code: "OFFLINE_DESKTOP_BRIDGE_UNAVAILABLE"
    } satisfies Partial<ApiError>);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
