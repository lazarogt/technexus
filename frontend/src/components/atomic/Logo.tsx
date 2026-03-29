import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link className="inline-flex items-center gap-3" to="/">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink font-display text-lg font-bold text-white">
        TN
      </span>
      <span>
        <span className="block font-display text-lg font-bold uppercase tracking-[0.22em] text-slate">
          TechNexus
        </span>
        <span className="block text-sm text-slate">Marketplace frontbase</span>
      </span>
    </Link>
  );
}
