import { Skeleton } from "@/components/shared/Skeleton";

export function StoreSkeletonCard() {
  return (
    <article className="store-product-card store-product-card-skeleton" aria-hidden="true">
      <Skeleton className="store-product-media skeleton-media" />
      <div className="store-product-body">
        <div className="store-product-topline">
          <Skeleton className="skeleton-chip" />
          <Skeleton className="skeleton-chip" />
        </div>
        <Skeleton className="skeleton-line skeleton-line-lg" />
        <Skeleton className="skeleton-line skeleton-line-md" />
        <Skeleton className="skeleton-line skeleton-line-sm" />
        <Skeleton className="skeleton-button" />
      </div>
    </article>
  );
}
