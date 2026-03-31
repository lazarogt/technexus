import { Skeleton } from "@/components/shared/Skeleton";

type ProductRailSkeletonProps = {
  count?: number;
};

export function ProductRailSkeleton({ count = 4 }: ProductRailSkeletonProps) {
  return (
    <div className="product-rail">
      {Array.from({ length: count }, (_, index) => (
        <article key={index} className="product-card product-card-skeleton" aria-hidden="true">
          <Skeleton className="product-card-image skeleton-media" />
          <div className="product-card-body">
            <Skeleton className="skeleton-chip" />
            <Skeleton className="skeleton-line skeleton-line-lg" />
            <Skeleton className="skeleton-line skeleton-line-md" />
            <Skeleton className="skeleton-line skeleton-line-sm" />
            <Skeleton className="skeleton-button" />
          </div>
        </article>
      ))}
    </div>
  );
}
