import { ProductRail } from "@/components/store/ProductRail";
import { StoreSkeletonCard } from "@/components/store/StoreSkeletonCard";

type ProductRailSkeletonProps = {
  count?: number;
};

export function ProductRailSkeleton({ count = 4 }: ProductRailSkeletonProps) {
  return (
    <ProductRail>
      {Array.from({ length: count }, (_, index) => (
        <StoreSkeletonCard key={index} />
      ))}
    </ProductRail>
  );
}
