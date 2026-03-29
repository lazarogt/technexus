type CatalogSkeletonProps = {
  count?: number;
};

export function CatalogSkeleton({ count = 8 }: CatalogSkeletonProps) {
  return (
    <div className="catalog-grid">
      {Array.from({ length: count }).map((_, index) => (
        <article className="product-card product-card--skeleton" key={`skeleton-${index}`}>
          <div className="product-card__media product-card__media--skeleton" />
          <div className="product-card__content">
            <div className="skeleton-line skeleton-line--short" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-line--price" />
          </div>
        </article>
      ))}
    </div>
  );
}
