import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";

type TopbarProps = {
  title: string;
  subtitle: string;
};

export function Topbar({ title, subtitle }: TopbarProps) {
  const { logout, user } = useAuth();

  return (
    <header className="dashboard-topbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="dashboard-topbar-actions">
        <div className="dashboard-user-chip">
          <Bell size={16} />
          <span>{user?.email}</span>
        </div>
        <button type="button" className="header-link header-link-button" onClick={logout}>
          <LogOut size={16} />
          Salir
        </button>
      </div>
    </header>
  );
}
