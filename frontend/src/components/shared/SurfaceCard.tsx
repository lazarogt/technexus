import type { PropsWithChildren, ReactNode } from "react";

type SurfaceCardProps = PropsWithChildren<{
  title?: string;
  description?: string;
  action?: ReactNode;
}>;

export function SurfaceCard({ title, description, action, children }: SurfaceCardProps) {
  return (
    <section className="surface-card">
      {(title || description || action) && (
        <header className="surface-card-header">
          <div>
            {title ? <h3>{title}</h3> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
