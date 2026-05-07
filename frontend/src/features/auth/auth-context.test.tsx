import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";

vi.mock("@/demo/demo-env", () => ({ DEMO_AUTO_START: true, DEMO_MODE: true }));
vi.mock("@/features/api/auth-api", () => ({
  createDemoSession: vi.fn(),
  createGuestSession: vi.fn(),
  getProfile: vi.fn(),
  login: vi.fn(),
  register: vi.fn()
}));

import { createDemoSession } from "@/features/api/auth-api";

function Probe() {
  const { isBootstrapping, isAuthenticated, user } = useAuth();
  return (
    <div>
      <span data-testid="boot">{String(isBootstrapping)}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? ""}</span>
    </div>
  );
}

describe("AuthProvider demo bootstrap", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(createDemoSession).mockResolvedValue({
      token: "demo-token",
      user: {
        id: "demo-customer-1",
        name: "Demo Customer",
        email: "demo.customer@example.com",
        role: "customer",
        isBlocked: false,
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("auto logs a demo customer when there is no persisted session", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(vi.mocked(createDemoSession)).toHaveBeenCalledWith({ role: "customer" });
    });

    expect(screen.getByTestId("auth").textContent).toBe("true");
    expect(screen.getByTestId("email").textContent).toBe("demo.customer@example.com");
    expect(screen.getByTestId("boot").textContent).toBe("false");
  });
});
