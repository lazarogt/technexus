import { Link } from "react-router-dom";
import { useSession } from "../lib/auth-context";
import { getRoleDashboardPath } from "../lib/site-routes";

export default function NotFoundPage() {
  const { role } = useSession();
  const homePath = getRoleDashboardPath(role);

  return (
    <div className="panel-surface p-8 text-center sm:p-12">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate">404</p>
      <h1 className="mt-4 font-display text-4xl font-bold text-ink">Route not mapped yet.</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate sm:text-base">
        The requested placeholder page does not exist in the initial route map.
      </p>
      <Link className="action-primary mt-8" to={homePath}>
        Return home
      </Link>
    </div>
  );
}
