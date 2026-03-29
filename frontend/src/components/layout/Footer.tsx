import { Link } from "react-router-dom";
import { useSession } from "../../lib/auth-context";
import { getFooterLinks } from "../../lib/site-routes";
import { Card } from "../ui/Card";

export function Footer() {
  const { isAuthenticated, role } = useSession();
  const footerLinks = getFooterLinks({
    isAuthenticated,
    role
  });

  return (
    <footer className="border-t border-black/5 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" title="TechNexus">
          <p className="max-w-xl text-sm text-slate">
            Reusable marketplace shell with storefront, checkout, seller workspace and admin
            operations entry points.
          </p>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            {footerLinks.map((item) =>
              item.href.startsWith("mailto:") ? (
                <a className="action-secondary" href={item.href} key={item.href}>
                  {item.label}
                </a>
              ) : (
                <Link className="action-secondary" key={item.href} to={item.href}>
                  {item.label}
                </Link>
              )
            )}
          </div>
        </Card>
      </div>
    </footer>
  );
}
