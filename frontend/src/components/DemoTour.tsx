import { Joyride } from "react-joyride";
import { useTranslation } from "react-i18next";
import { useDemoTour } from "@/demo/demo-tour-context";

export default function DemoTour() {
  const { t } = useTranslation();
  const { isDemoMode, isPreparing, joyrideCallback, run, stepIndex, steps } = useDemoTour();

  if (!isDemoMode) {
    return null;
  }

  return (
    <Joyride
      onEvent={joyrideCallback}
      steps={steps}
      run={run && !isPreparing}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      options={{
        buttons: ["back", "close", "primary", "skip"],
        closeButtonAction: "skip",
        primaryColor: "#2563eb",
        zIndex: 9999,
        textColor: "#17202c",
        backgroundColor: "#ffffff",
        overlayColor: "rgba(11, 18, 29, 0.48)",
        showProgress: true,
        scrollDuration: 420,
        scrollOffset: 24
      }}
      floatingOptions={{
        strategy: "fixed"
      }}
      locale={{
        back: t("buttons.back"),
        close: t("buttons.close"),
        last: t("buttons.close"),
        next: t("buttons.continue"),
        skip: t("demo.skip")
      }}
      styles={{
        arrow: {
          color: "#ffffff"
        },
        tooltip: {
          borderRadius: 18,
          boxShadow: "0 18px 48px rgba(15, 23, 42, 0.2)",
          maxWidth: "min(360px, calc(100vw - 24px))",
          width: "min(360px, calc(100vw - 24px))"
        },
        tooltipContent: {
          maxHeight: "min(40vh, 320px)",
          overflowY: "auto"
        },
        buttonPrimary: {
          borderRadius: 999,
          fontWeight: 700
        },
        buttonBack: {
          color: "#475569"
        },
        buttonSkip: {
          color: "#475569"
        }
      }}
    />
  );
}
