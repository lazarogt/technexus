import type { PropsWithChildren } from "react";
import { cn } from "../../lib/ui";

export type BadgeVariant = "success" | "warning" | "error" | "info";

const badgeClasses: Record<BadgeVariant, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  error: "bg-error-soft text-error",
  info: "bg-info-soft text-info"
};

/**
 * Status badge used across tables, cards and dashboards.
 */
export type BadgeProps = PropsWithChildren<{
  /** Semantic color treatment for the badge. */
  variant?: BadgeVariant;
  /** Optional extra classes for layout overrides. */
  className?: string;
  /** Optional label for assistive technology when the badge text is abbreviated. */
  ariaLabel?: string;
}>;

export function Badge({ variant = "info", className, ariaLabel, children }: BadgeProps) {
  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-pill border border-black/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]",
        badgeClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
