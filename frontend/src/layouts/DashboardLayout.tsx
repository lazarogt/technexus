import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { accountNavigation, adminNavigation, sellerNavigation } from "@/lib/routes";

type DashboardLayoutProps = {
  section: "account" | "seller" | "admin";
};

const copy = {
  account: {
    titleKey: "dashboard.sections.account.title",
    subtitleKey: "dashboard.sections.account.subtitle",
    nav: accountNavigation
  },
  seller: {
    titleKey: "dashboard.sections.seller.title",
    subtitleKey: "dashboard.sections.seller.subtitle",
    nav: sellerNavigation
  },
  admin: {
    titleKey: "dashboard.sections.admin.title",
    subtitleKey: "dashboard.sections.admin.subtitle",
    nav: adminNavigation
  }
} as const;

export function DashboardLayout({ section }: DashboardLayoutProps) {
  const { t } = useTranslation();
  const current = copy[section];
  const title = t(current.titleKey);
  const subtitle = t(current.subtitleKey);

  return (
    <div className="dashboard-layout">
      <Sidebar items={current.nav} title={title} />
      <div className="dashboard-content">
        <Topbar title={title} subtitle={subtitle} />
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
