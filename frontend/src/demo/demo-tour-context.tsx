import {
  createContext,
  startTransition,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { EventData, Step } from "react-joyride";
import { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { DEMO_MODE } from "@/demo/demo-env";
import {
  getDashboardPath,
  getDemoTourSteps,
  type DemoRole,
  type DemoStep,
  type DemoTourStep
} from "@/demo/tourConfig";
import { createDemoSession } from "@/features/api/auth-api";
import { useAuth } from "@/features/auth/auth-context";
import { clearStoragePrefix, removeStorage, readStorage, writeStorage } from "@/lib/storage";

type DemoTourContextValue = {
  isDemoMode: boolean;
  isTourRunning: boolean;
  isInteractionLocked: boolean;
  currentRole: DemoRole | null;
  currentPhase: DemoStep;
  isPreparing: boolean;
  isSwitchingRole: boolean;
  run: boolean;
  stepIndex: number;
  steps: Step[];
  joyrideCallback: (data: EventData) => void;
  restartDemoTour: () => void;
  startDemoTour: () => void;
  stopDemoTour: () => void;
  exitDemo: () => void;
  switchDemoRole: (role: DemoRole) => Promise<void>;
};

const DEMO_TOUR_SEEN_KEY = "demoTourSeen";
const DEMO_TOUR_STEP_KEY = "demoTourStep";
const DEMO_TOUR_ROLE_KEY = "demoTourRole";
const PREPARE_TIMEOUT_MS = 300;
const PREPARE_INTERVAL_MS = 40;

const DemoTourContext = createContext<DemoTourContextValue | null>(null);

const waitFor = async (predicate: () => boolean, timeoutMs: number) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return true;
    }

    await new Promise((resolve) => window.setTimeout(resolve, PREPARE_INTERVAL_MS));
  }

  return predicate();
};

const toJoyrideStep = (step: DemoTourStep): Step => {
  const joyrideStep = { ...step } as Partial<DemoTourStep>;
  delete joyrideStep.fallbackToCenter;
  delete joyrideStep.phase;
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
  const steps = useMemo(() => getDemoTourSteps(t), [t]);
  const initialRun = DEMO_MODE && readStorage<boolean>(DEMO_TOUR_SEEN_KEY) !== true;
  const [run, setRun] = useState(initialRun);
  const [stepIndex, setStepIndex] = useState<number>(() => (DEMO_MODE ? getStoredStepIndex() : 0));
  const [currentPhase, setCurrentPhase] = useState<DemoStep>(() => steps[getStoredStepIndex()]?.phase ?? "DONE");
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [stepOverride, setStepOverride] = useState<Step | null>(null);
  const pathnameRef = useRef(location.pathname);
  const roleRef = useRef<DemoRole | null>(role);
  const prepareTokenRef = useRef(0);
  const initializedRef = useRef(false);
  const isInteractionLocked = run || isPreparing || isSwitchingRole;

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

    document.body.classList.toggle("demo-lock", isInteractionLocked);

    return () => {
      document.body.classList.remove("demo-lock");
    };
  }, [isInteractionLocked]);

  useEffect(() => {
    if (!DEMO_MODE || !run) {
      removeStorage(DEMO_TOUR_STEP_KEY);
      return;
    }

    writeStorage(DEMO_TOUR_STEP_KEY, stepIndex);
  }, [run, stepIndex]);

  const completeTour = useCallback((markSeen: boolean) => {
    setRun(false);
    setIsPreparing(false);
    setIsSwitchingRole(false);
    setStepOverride(null);
    setStepIndex(0);
    setCurrentPhase("DONE");
    removeStorage(DEMO_TOUR_STEP_KEY);

    if (markSeen) {
      writeStorage(DEMO_TOUR_SEEN_KEY, true);
    }
  }, []);

  const prepareStep = useCallback(
    async (targetIndex: number) => {
      if (!DEMO_MODE) {
        return;
      }

      const nextStep = steps[targetIndex];

      if (!nextStep) {
        completeTour(true);
        return;
      }

      const prepareToken = prepareTokenRef.current + 1;
      prepareTokenRef.current = prepareToken;
      setIsPreparing(true);
      setStepOverride(null);

      if (nextStep.requiredRole && roleRef.current !== nextStep.requiredRole) {
        setIsSwitchingRole(true);

        try {
          const nextSession = await createDemoSession({ role: nextStep.requiredRole });

          if (prepareTokenRef.current !== prepareToken) {
            return;
          }

          applySession(nextSession);
          writeStorage(DEMO_TOUR_ROLE_KEY, nextStep.requiredRole);
          await waitFor(() => roleRef.current === nextStep.requiredRole, PREPARE_TIMEOUT_MS);
        } finally {
          if (prepareTokenRef.current === prepareToken) {
            setIsSwitchingRole(false);
          }
        }
      }

      if (nextStep.route && pathnameRef.current !== nextStep.route) {
        startTransition(() => {
          navigate(nextStep.route!);
        });

        await waitFor(() => pathnameRef.current === nextStep.route, PREPARE_TIMEOUT_MS);
      }

      const selector = typeof nextStep.target === "string" ? nextStep.target : null;
      const targetFound = selector
        ? await waitFor(() => document.querySelector(selector) !== null, PREPARE_TIMEOUT_MS)
        : true;

      if (prepareTokenRef.current !== prepareToken) {
        return;
      }

      if (!targetFound && !nextStep.fallbackToCenter) {
        const skipTo = targetIndex + 1;

        if (skipTo >= steps.length) {
          completeTour(true);
          return;
        }

        void prepareStep(skipTo);
        return;
      }

      setCurrentPhase(nextStep.phase);
      setStepIndex(targetIndex);
      setStepOverride(targetFound ? toJoyrideStep(nextStep) : toCenteredStep(nextStep));
      setIsPreparing(false);
    },
    [applySession, completeTour, navigate, steps]
  );

  useEffect(() => {
    if (!DEMO_MODE || initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    if (initialRun) {
      void prepareStep(getStoredStepIndex());
    }
  }, [initialRun, prepareStep]);

  const startDemoTour = useCallback(() => {
    if (!DEMO_MODE) {
      return;
    }

    const nextIndex = getStoredStepIndex();
    removeStorage(DEMO_TOUR_SEEN_KEY);
    setRun(true);
    void prepareStep(nextIndex);
  }, [prepareStep]);

  const restartDemoTour = useCallback(() => {
    if (!DEMO_MODE) {
      return;
    }

    removeStorage(DEMO_TOUR_SEEN_KEY);
    removeStorage(DEMO_TOUR_STEP_KEY);
    writeStorage(DEMO_TOUR_ROLE_KEY, "customer");
    setRun(true);
    void prepareStep(0);
  }, [prepareStep]);

  const stopDemoTour = useCallback(() => {
    completeTour(false);
  }, [completeTour]);

  const exitDemo = useCallback(() => {
    completeTour(false);
    clearStoragePrefix();
    window.location.assign("/");
  }, [completeTour]);

  const switchDemoRole = useCallback(
    async (targetRole: DemoRole) => {
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
    },
    [applySession, navigate]
  );

  const joyrideCallback = useCallback(
    (data: EventData) => {
      if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
        completeTour(true);
        return;
      }

      if (data.type === EVENTS.TARGET_NOT_FOUND) {
        const nextIndex = data.action === ACTIONS.PREV ? data.index - 1 : data.index + 1;

        if (nextIndex < 0) {
          return;
        }

        void prepareStep(nextIndex);
        return;
      }

      if (data.type === EVENTS.STEP_AFTER) {
        const nextIndex = data.action === ACTIONS.PREV ? data.index - 1 : data.index + 1;

        if (nextIndex < 0) {
          return;
        }

        if (nextIndex >= steps.length) {
          completeTour(true);
          return;
        }

        void prepareStep(nextIndex);
      }
    },
    [completeTour, prepareStep, steps.length]
  );

  const renderedSteps = useMemo(
    () =>
      steps.map((step, index) => {
        if (index === stepIndex && stepOverride) {
          return stepOverride;
        }

        return toJoyrideStep(step);
      }),
    [stepIndex, stepOverride, steps]
  );

  return (
    <DemoTourContext.Provider
      value={{
        isDemoMode: DEMO_MODE,
        isTourRunning: run,
        isInteractionLocked,
        currentRole: role ?? readStorage<DemoRole>(DEMO_TOUR_ROLE_KEY) ?? null,
        currentPhase,
        isPreparing,
        isSwitchingRole,
        run,
        stepIndex,
        steps: renderedSteps,
        joyrideCallback,
        restartDemoTour,
        startDemoTour,
        stopDemoTour,
        exitDemo,
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
