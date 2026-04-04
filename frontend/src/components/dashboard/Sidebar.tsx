import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";
import type { NavigationItem } from "@/lib/routes";

type SidebarProps = {
  items: NavigationItem[];
  title: string;
};

export function Sidebar({ items, title }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="dashboard-sidebar">
      <Link to="/" className="dashboard-brand">
        <span>Tech</span>Nexus
      </Link>
      <p className="dashboard-sidebar-title">{title}</p>
      <nav className="dashboard-nav">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/account" || item.href === "/seller" || item.href === "/admin"}
              className={({ isActive }) => `dashboard-nav-item ${isActive ? "is-active" : ""}`}
            >
              <Icon size={18} />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
