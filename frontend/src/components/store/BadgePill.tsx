import { clsx } from "clsx";
import type { ReactNode } from "react";

type BadgePillProps = {
  children: ReactNode;
  tone?: "highlight" | "signal" | "neutral";
};

export function BadgePill({ children, tone = "neutral" }: BadgePillProps) {
  return <span className={clsx("store-badge", `is-${tone}`)}>{children}</span>;
}
