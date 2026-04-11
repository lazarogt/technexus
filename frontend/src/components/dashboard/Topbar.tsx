import { Bell, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DemoControls } from "@/components/demo/DemoControls";
import { useAuth } from "@/features/auth/auth-context";

type TopbarProps = {
  title: string;
  subtitle: string;
};

export function Topbar({ title, subtitle }: TopbarProps) {
  const { t } = useTranslation();
  const { logout, user } = useAuth();

  return (
    <header className="dashboard-topbar" data-tour="dashboard-overview">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="dashboard-topbar-actions">
        <DemoControls />
        <div className="dashboard-user-chip">
          <Bell size={16} />
          <span>{user?.email}</span>
        </div>
        <button type="button" className="header-link header-link-button" data-demo-lock="true" onClick={logout}>
          <LogOut size={16} />
          {t("dashboard.topbar.logout")}
        </button>
      </div>
    </header>
  );
}
