import { NavLink } from "react-router-dom";

type NavItemProps = {
  label: string;
  path: string;
};

export function NavItem({ label, path }: NavItemProps) {
  return (
    <NavLink
      className={({ isActive }) =>
        `rounded-full px-4 py-2 text-sm font-semibold transition ${
          isActive
            ? "bg-ink text-white"
            : "bg-white/70 text-slate hover:bg-white hover:text-ink"
        }`
      }
      to={path}
    >
      {label}
    </NavLink>
  );
}
