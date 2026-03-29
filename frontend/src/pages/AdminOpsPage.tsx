import { AdminOpsPanel } from "../components/admin/AdminOpsPanel";
import { useSession } from "../lib/auth-context";

export default function AdminOpsPage() {
  const { token, user } = useSession();

  return (
    <div className="space-y-6">
      <section className="panel-surface overflow-hidden bg-ink px-6 py-8 text-white sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
          <div>
            <span className="inline-flex rounded-pill border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/70">
              Admin operations
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-none sm:text-5xl">
              Monitor queue health, worker status and platform-wide ops metrics.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              This surface is restricted to admin sessions and reads only `/admin/ops/*` plus
              `/metrics`.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/54">Admin account</p>
            <p className="mt-2 text-2xl font-bold text-white">{user?.name ?? "Admin"}</p>
            <p className="mt-2 text-sm text-white/72">{user?.email}</p>
          </div>
        </div>
      </section>

      <AdminOpsPanel token={token} />
    </div>
  );
}
