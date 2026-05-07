import "@/i18n";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();
const mockCreateDemoSession = vi.fn();

let joyrideProps: Record<string, unknown> | null = null;

vi.mock("react-joyride", () => ({
  ACTIONS: {
    PREV: "prev"
  },
  EVENTS: {
    STEP_AFTER: "step:after",
    TARGET_NOT_FOUND: "error:target_not_found"
  },
  STATUS: {
    FINISHED: "finished",
    SKIPPED: "skipped"
  },
  Joyride: (props: Record<string, unknown>) => {
    joyrideProps = props;
    return <div data-testid="joyride-probe" />;
  }
}));

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock("@/features/api/auth-api", async () => {
  const actual = await vi.importActual<typeof import("@/features/api/auth-api")>("@/features/api/auth-api");

  return {
    ...actual,
    createDemoSession: (...args: Parameters<typeof actual.createDemoSession>) => mockCreateDemoSession(...args)
  };
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

async function importDemoModules() {
  const contextModule = await import("@/demo/demo-tour-context");
  const componentModule = await import("@/components/DemoTour");
  const controlsModule = await import("@/components/demo/DemoControls");

  return {
    DemoTourProvider: contextModule.DemoTourProvider,
    DemoTour: componentModule.default,
    DemoControls: controlsModule.DemoControls
  };
}

describe("DemoTour", () => {
  beforeEach(() => {
    joyrideProps = null;
    window.localStorage.clear();
    mockCreateDemoSession.mockReset();
    mockCreateDemoSession.mockResolvedValue({
      token: "customer-token",
      user: {
        id: "customer-1",
        name: "Demo Customer",
        email: "customer.one@technexus.local",
        role: "customer",
        isBlocked: false,
        createdAt: "2026-04-01T00:00:00.000Z"
      }
    });
    mockUseAuth.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("auto-starts only when demo mode is enabled and the tour was not seen", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    vi.stubEnv("VITE_DEMO_AUTO_START", "true");
    mockUseAuth.mockReturnValue({
      applySession: vi.fn(),
      role: null
    });

    const { DemoTourProvider, DemoTour } = await importDemoModules();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <DemoTourProvider>
          <div className="navbar" />
          <DemoTour />
        </DemoTourProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("joyride-probe")).toBeInTheDocument();
      expect(joyrideProps?.run).toBe(true);
      expect(joyrideProps?.stepIndex).toBe(0);
    });
  });

  it("keeps the demo available without auto-starting for regular visitors", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    vi.stubEnv("VITE_DEMO_AUTO_START", "false");
    mockUseAuth.mockReturnValue({
      applySession: vi.fn(),
      role: null
    });

    const { DemoTourProvider, DemoTour, DemoControls } = await importDemoModules();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <DemoTourProvider>
          <div className="navbar" />
          <DemoControls />
          <DemoTour />
        </DemoTourProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("joyride-probe")).toBeInTheDocument();
    expect(joyrideProps?.run).toBe(false);
    expect(screen.getByRole("button", { name: "Iniciar tour demo" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Iniciar tour demo" }));

    await waitFor(() => {
      expect(joyrideProps?.run).toBe(true);
      expect(joyrideProps?.stepIndex).toBe(0);
    });
  });

  it("forces the guided demo from the start when /?demo=true is present", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    window.localStorage.setItem("technexus:demoTourSeen", JSON.stringify(true));
    window.localStorage.setItem("technexus:demoTourStep", JSON.stringify(5));

    mockUseAuth.mockReturnValue({
      applySession: vi.fn(),
      role: null
    });

    const { DemoTourProvider, DemoTour } = await importDemoModules();

    render(
      <MemoryRouter initialEntries={["/?demo=true"]}>
        <DemoTourProvider>
          <div className="navbar" />
          <DemoTour />
        </DemoTourProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("joyride-probe")).toBeInTheDocument();
      expect(joyrideProps?.run).toBe(true);
      expect(joyrideProps?.stepIndex).toBe(0);
    });
  });

  it("does not render when demo mode is disabled", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "false");
    mockUseAuth.mockReturnValue({
      applySession: vi.fn(),
      role: null
    });

    const { DemoTourProvider, DemoTour } = await importDemoModules();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <DemoTourProvider>
          <div className="navbar" />
          <DemoTour />
        </DemoTourProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("joyride-probe")).not.toBeInTheDocument();
  });

  it("restarts manually from the demo controls", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    window.localStorage.setItem("technexus:demoTourSeen", JSON.stringify(true));

    mockUseAuth.mockReturnValue({
      applySession: vi.fn(),
      role: "customer"
    });

    const { DemoTourProvider, DemoTour, DemoControls } = await importDemoModules();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <DemoTourProvider>
          <div className="navbar" />
          <DemoControls />
          <DemoTour />
        </DemoTourProvider>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Reiniciar tour" }));

    await waitFor(() => {
      expect(joyrideProps?.run).toBe(true);
      expect(joyrideProps?.stepIndex).toBe(0);
    });
  });

  it("falls back to a centered step when a dashboard target is missing", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    vi.stubEnv("VITE_DEMO_AUTO_START", "true");
    window.localStorage.setItem("technexus:demoTourStep", JSON.stringify(5));

    mockUseAuth.mockReturnValue({
      applySession: vi.fn(),
      role: "seller"
    });

    const { DemoTourProvider, DemoTour } = await importDemoModules();

    render(
      <MemoryRouter initialEntries={["/seller"]}>
        <DemoTourProvider>
          <DemoTour />
        </DemoTourProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      const steps = joyrideProps?.steps as Array<{ target: string }>;
      expect(steps[5]?.target).toBe("body");
    }, { timeout: 4_000 });
  });

  it("switches demo roles and navigates to the matching dashboard", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    window.localStorage.setItem("technexus:demoTourSeen", JSON.stringify(true));

    const applySession = vi.fn();
    mockUseAuth.mockReturnValue({
      applySession,
      role: "customer"
    });
    mockCreateDemoSession.mockResolvedValue({
      token: "seller-token",
      user: {
        id: "seller-1",
        name: "Lina Morales",
        email: "seller.one@technexus.local",
        role: "seller",
        isBlocked: false,
        createdAt: "2026-04-01T00:00:00.000Z"
      }
    });

    const { DemoTourProvider, DemoControls } = await importDemoModules();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="*"
            element={
              <DemoTourProvider>
                <DemoControls />
                <LocationProbe />
              </DemoTourProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Vendedor" }));

    await waitFor(() => {
      expect(applySession).toHaveBeenCalled();
      expect(screen.getByTestId("location-probe")).toHaveTextContent("/seller");
    });
  });
});
