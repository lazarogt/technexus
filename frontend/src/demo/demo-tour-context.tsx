import { createContext, startTransition, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { EventData, Step } from "react-joyride";
import { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { DEMO_MODE } from "@/demo/demo-env";
import { getDashboardPath, getDemoTourSteps, type DemoRole, type DemoTourStep } from "@/demo/tourConfig";
import { createDemoSession } from "@/features/api/auth-api";
import { useAuth } from "@/features/auth/auth-context";
import { removeStorage, readStorage, writeStorage } from "@/lib/storage";

type DemoTourContextValue = {
  isDemoMode: boolean;
  isTourRunning: boolean;
  currentRole: DemoRole | null;
  isPreparing: boolean;
  isSwitchingRole: boolean;
  run: boolean;
  stepIndex: number;
  steps: Step[];
  joyrideCallback: (data: EventData) => void;
  restartDemoTour: () => void;
  startDemoTour: () => void;
  stopDemoTour: () => void;
  switchDemoRole: (role: DemoRole) => Promise<void>;
};

const DEMO_TOUR_SEEN_KEY = "demoTourSeen";
const DEMO_TOUR_STEP_KEY = "demoTourStep";
const DEMO_TOUR_ROLE_KEY = "demoTourRole";
const PREPARE_TIMEOUT_MS = 2_500;

const DemoTourContext = createContext<DemoTourContextValue | null>(null);

const waitFor = async (predicate: () => boolean, timeoutMs: number) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return true;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }

  return predicate();
};

const toJoyrideStep = (step: DemoTourStep): Step => {
  const joyrideStep = { ...step } as Partial<DemoTourStep>;
  delete joyrideStep.fallbackToCenter;
  delete joyrideStep.requiredRole;
  delete joyrideStep.route;
  delete joyrideStep.id;
  return joyrideStep as Step;
};

const toCenteredStep = (step: DemoTourStep): Step => ({
  ...toJoyrideStep(step),
  target: "body",
  placement: "center",
  skipBeacon: true
});

const getStoredStepIndex = () => {
  const storedStep = readStorage<number>(DEMO_TOUR_STEP_KEY);
  return typeof storedStep === "number" && Number.isInteger(storedStep) && storedStep >= 0 ? storedStep : 0;
};

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { applySession, role } = useAuth();
  const [run, setRun] = useState(() => DEMO_MODE && readStorage<boolean>(DEMO_TOUR_SEEN_KEY) !== true);
  const [stepIndex, setStepIndex] = useState<number>(() => (DEMO_MODE ? getStoredStepIndex() : 0));
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [stepOverride, setStepOverride] = useState<Step | null>(null);
  const pathnameRef = useRef(location.pathname);
  const roleRef = useRef<DemoRole | null>(role);
  const prepareTokenRef = useRef(0);
  const steps = useMemo(() => getDemoTourSteps(t), [t]);
  const currentStep = steps[stepIndex];

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    if (!DEMO_MODE) {
      return;
    }

    if (!run) {
      removeStorage(DEMO_TOUR_STEP_KEY);
      return;
    }

    writeStorage(DEMO_TOUR_STEP_KEY, stepIndex);
  }, [run, stepIndex]);

  useEffect(() => {
    if (!DEMO_MODE) {
      return;
    }

    if (!currentStep || !run) {
      setStepOverride(null);
      return;
    }

    const prepareToken = prepareTokenRef.current + 1;
    prepareTokenRef.current = prepareToken;
    let cancelled = false;

    const prepareStep = async () => {
      setIsPreparing(true);
      setStepOverride(null);

      if (currentStep.requiredRole && roleRef.current !== currentStep.requiredRole) {
        setIsSwitchingRole(true);

        try {
          const nextSession = await createDemoSession({ role: currentStep.requiredRole });
          if (cancelled || prepareTokenRef.current !== prepareToken) {
            return;
          }

          applySession(nextSession);
          writeStorage(DEMO_TOUR_ROLE_KEY, currentStep.requiredRole);
          await waitFor(() => roleRef.current === currentStep.requiredRole, PREPARE_TIMEOUT_MS);
        } finally {
          if (!cancelled && prepareTokenRef.current === prepareToken) {
            setIsSwitchingRole(false);
          }
        }
      }

      if (currentStep.route && pathnameRef.current !== currentStep.route) {
        startTransition(() => {
          navigate(currentStep.route!);
        });

        await waitFor(() => pathnameRef.current === currentStep.route, PREPARE_TIMEOUT_MS);
      }

      const selector = typeof currentStep.target === "string" ? currentStep.target : null;
      const targetFound = selector
        ? await waitFor(() => document.querySelector(selector) !== null, PREPARE_TIMEOUT_MS)
        : true;

      if (cancelled || prepareTokenRef.current !== prepareToken) {
        return;
      }

      if (!targetFound && !currentStep.fallbackToCenter) {
        setIsPreparing(false);
        setStepIndex((current) => Math.min(current + 1, steps.length - 1));
        return;
      }

      setStepOverride(targetFound ? toJoyrideStep(currentStep) : toCenteredStep(currentStep));
      setIsPreparing(false);
    };

    void prepareStep();

    return () => {
      cancelled = true;
    };
  }, [applySession, currentStep, navigate, run, stepIndex, steps.length]);

  const completeTour = (markSeen: boolean) => {
    setRun(false);
    setIsPreparing(false);
    setStepOverride(null);
    setStepIndex(0);
    removeStorage(DEMO_TOUR_STEP_KEY);

    if (markSeen) {
      writeStorage(DEMO_TOUR_SEEN_KEY, true);
    }
  };

  const joyrideCallback = (data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      completeTour(true);
      return;
    }

    if (data.type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      return;
    }

    if (data.type === EVENTS.STEP_AFTER) {
      const offset = data.action === ACTIONS.PREV ? -1 : 1;
      setStepIndex((current) => {
        const nextIndex = current + offset;
        return Math.min(Math.max(nextIndex, 0), steps.length - 1);
      });
    }
  };

  const startDemoTour = () => {
    if (!DEMO_MODE) {
      return;
    }

    setRun(true);
    setStepIndex(getStoredStepIndex());
    removeStorage(DEMO_TOUR_SEEN_KEY);
  };

  const restartDemoTour = () => {
    if (!DEMO_MODE) {
      return;
    }

    removeStorage(DEMO_TOUR_SEEN_KEY);
    removeStorage(DEMO_TOUR_STEP_KEY);
    writeStorage(DEMO_TOUR_ROLE_KEY, "customer");
    setStepIndex(0);
    setRun(true);
  };

  const stopDemoTour = () => {
    setRun(false);
    setIsPreparing(false);
  };

  const switchDemoRole = async (targetRole: DemoRole) => {
    if (!DEMO_MODE) {
      return;
    }

    setIsSwitchingRole(true);

    try {
      const nextSession = await createDemoSession({ role: targetRole });
      applySession(nextSession);
      writeStorage(DEMO_TOUR_ROLE_KEY, targetRole);
      startTransition(() => {
        navigate(getDashboardPath(targetRole));
      });
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const renderedSteps = steps.map((step, index) => {
    if (index === stepIndex && stepOverride) {
      return stepOverride;
    }

    return toJoyrideStep(step);
  });

  return (
    <DemoTourContext.Provider
      value={{
        isDemoMode: DEMO_MODE,
        isTourRunning: run,
        currentRole: role ?? readStorage<DemoRole>(DEMO_TOUR_ROLE_KEY) ?? null,
        isPreparing,
        isSwitchingRole,
        run,
        stepIndex,
        steps: renderedSteps,
        joyrideCallback,
        restartDemoTour,
        startDemoTour,
        stopDemoTour,
        switchDemoRole
      }}
    >
      {children}
    </DemoTourContext.Provider>
  );
}

export function useDemoTour() {
  const context = useContext(DemoTourContext);

  if (!context) {
    throw new Error("useDemoTour must be used within DemoTourProvider");
  }

  return context;
}
