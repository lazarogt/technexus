import { useId, type PropsWithChildren, type ReactNode } from "react";
import { cn } from "../../lib/ui";

/**
 * Generic content card with optional heading and action slot.
 */
export type CardProps = PropsWithChildren<{
  /** Small label rendered above the title. */
  eyebrow?: ReactNode;
  /** Main title for the card. */
  title?: ReactNode;
  /** Optional supporting text rendered below the title. */
  description?: ReactNode;
  /** Optional action row rendered in the header. */
  actions?: ReactNode;
  /** Additional classes for layout overrides. */
  className?: string;
  /** Optional landmark role for screen readers. */
  role?: "region" | "group" | "status" | "alert";
}>;

export function Card({ eyebrow, title, description, actions, className, children, role }: CardProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={cn("panel-surface p-5 sm:p-6", className)}
      role={role}
    >
      {eyebrow || title || description || actions ? (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow ? <p className="text-label">{eyebrow}</p> : null}
            {title ? (
              <h2 className="mt-2 font-display text-2xl font-bold text-ink" id={titleId}>
                {title}
              </h2>
            ) : null}
            {description ? <p className="mt-2 text-sm leading-7 text-slate">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
        </header>
      ) : null}
      {children ? <div className={title || description || actions ? "mt-5" : undefined}>{children}</div> : null}
    </section>
  );
}
