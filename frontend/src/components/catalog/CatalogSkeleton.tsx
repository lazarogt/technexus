import { Skeleton } from "../ui/Skeleton";

type CatalogSkeletonProps = {
  count?: number;
};

export function CatalogSkeleton({ count = 8 }: CatalogSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <article className="panel-surface overflow-hidden rounded-[24px]" key={index}>
          <div className="aspect-[4/3] bg-mist" />
          <div className="space-y-3 p-4">
            <Skeleton lines={4} />
          </div>
        </article>
      ))}
    </div>
  );
}
