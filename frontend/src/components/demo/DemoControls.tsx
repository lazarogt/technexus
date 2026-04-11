import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/shared/Button";
import { useDemoTour } from "@/demo/demo-tour-context";
import type { DemoRole } from "@/demo/tourConfig";
import { USER_ROLE_LABELS } from "@/i18n/es";

type DemoControlsProps = {
  className?: string;
};

const demoRoles: DemoRole[] = ["customer", "seller", "admin"];

export function DemoControls({ className }: DemoControlsProps) {
  const { t } = useTranslation();
  const { currentRole, isDemoMode, isSwitchingRole, restartDemoTour, switchDemoRole } = useDemoTour();

  if (!isDemoMode) {
    return null;
  }

  return (
    <div className={clsx("demo-controls", className)}>
      <div className="demo-role-switch role-switch" data-tour="role-switch" aria-label={t("demo.roleSwitchLabel")}>
        {demoRoles.map((demoRole) => (
          <button
            key={demoRole}
            type="button"
            className={clsx("demo-role-button", currentRole === demoRole && "is-active")}
            onClick={() => void switchDemoRole(demoRole)}
            disabled={isSwitchingRole}
          >
            {USER_ROLE_LABELS[demoRole]}
          </button>
        ))}
      </div>
      <Button variant="ghost" className="demo-tour-button" onClick={restartDemoTour}>
        {t("demo.startTour")}
      </Button>
    </div>
  );
}
