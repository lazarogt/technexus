import { Skeleton } from "@/components/shared/Skeleton";

export function ProductPageSkeleton() {
  return (
    <div className="store-page stack-xl" aria-hidden="true">
      <section className="product-detail-layout">
        <div className="image-gallery">
          <Skeleton className="image-gallery-main skeleton-media" />
          <div className="image-gallery-thumbs">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="skeleton-thumb" />
            ))}
          </div>
        </div>
        <div className="stack-md">
          <Skeleton className="skeleton-chip" />
          <Skeleton className="skeleton-line skeleton-line-xl" />
          <Skeleton className="skeleton-line skeleton-line-lg" />
          <Skeleton className="skeleton-line skeleton-line-lg" />
          <Skeleton className="skeleton-line skeleton-line-md" />
          <div className="product-facts">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="skeleton-chip" />
            ))}
          </div>
        </div>
        <aside className="buy-box">
          <Skeleton className="skeleton-line skeleton-line-lg" />
          <Skeleton className="skeleton-line skeleton-line-sm" />
          <Skeleton className="skeleton-line skeleton-line-sm" />
          <Skeleton className="skeleton-button" />
          <Skeleton className="skeleton-button" />
        </aside>
      </section>
    </div>
  );
}
