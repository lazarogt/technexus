import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <div className="store-section-header">
      <div className="stack-xs">
        {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
        <div className="store-section-heading-row">
          <h2>{title}</h2>
          {action ? <div className="store-section-action">{action}</div> : null}
        </div>
        {description ? <p className="store-section-description">{description}</p> : null}
      </div>
    </div>
  );
}
