import { cn } from "../../lib/ui";
import { Skeleton } from "./Skeleton";

type PanelSkeletonProps = {
  lines?: number;
  className?: string;
};

/**
 * Backwards-compatible panel wrapper for skeleton states.
 */
export function PanelSkeleton({ lines = 4, className = "" }: PanelSkeletonProps) {
  return (
    <section aria-busy="true" aria-live="polite" className={cn("panel-surface p-6", className)} role="status">
      <div className="mb-4 h-4 w-28 rounded-pill bg-mist" />
      <Skeleton lines={lines} />
    </section>
  );
}
