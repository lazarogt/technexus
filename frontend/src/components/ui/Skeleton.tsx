import { cn } from "../../lib/ui";

/**
 * Animated skeleton placeholder for loading states.
 */
export type SkeletonProps = {
  /** Number of skeleton rows to render. */
  lines?: number;
  /** Optional class overrides for wrapping layout. */
  className?: string;
};

export function Skeleton({ lines = 1, className }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          className="h-4 animate-pulse rounded-pill bg-gradient-to-r from-mist via-white to-mist motion-reduce:animate-none"
          key={index}
          style={{
            animationDuration: "1.4s",
            opacity: 0.95,
            width: `${Math.max(45, 100 - index * 8)}%`
          }}
        />
      ))}
    </div>
  );
}
