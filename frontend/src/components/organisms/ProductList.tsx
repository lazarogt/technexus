import { useMemo } from "react";
import { FixedSizeGrid, type GridChildComponentProps, type GridOnItemsRenderedProps } from "react-window";
import type { Product } from "../../lib/types";
import { useElementSize } from "../../hooks/useElementSize";
import { ProductCard } from "../catalog/ProductCard";
import { Button } from "../ui/Button";

type ProductListProps = {
  products: Product[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  busyAction?: string | null;
  onAddToCart?: (productId: string) => void;
};

type GridItemData = {
  products: Product[];
  columnCount: number;
  busyAction?: string | null;
  onAddToCart?: (productId: string) => void;
};

const CARD_HEIGHT = 420;

const getColumnCount = (width: number): number => {
  if (width >= 1200) {
    return 3;
  }

  if (width >= 720) {
    return 2;
  }

  return 1;
};

function Cell({
  columnIndex,
  rowIndex,
  style,
  data
}: GridChildComponentProps<GridItemData>) {
  const index = rowIndex * data.columnCount + columnIndex;
  const product = data.products[index];

  if (!product) {
    return null;
  }

  return (
    <ProductCard
      busyAction={data.busyAction}
      onAddToCart={data.onAddToCart}
      product={product}
      style={style}
    />
  );
}

export function ProductList({
  products,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  busyAction,
  onAddToCart
}: ProductListProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const columnCount = useMemo(() => getColumnCount(size.width), [size.width]);
  const rowCount = Math.max(1, Math.ceil(products.length / columnCount));
  const height = Math.min(Math.max(560, rowCount * CARD_HEIGHT), 980);

  const handleItemsRendered = ({
    visibleRowStopIndex
  }: GridOnItemsRenderedProps) => {
    const lastVisibleIndex = (visibleRowStopIndex + 1) * columnCount;

    if (hasNextPage && !isFetchingNextPage && lastVisibleIndex >= products.length - columnCount) {
      onLoadMore();
    }
  };

  return (
    <div className="space-y-4">
      <div className="h-[68vh] min-h-[560px] w-full" ref={ref}>
        {size.width > 0 ? (
          <FixedSizeGrid
            className="!overflow-x-hidden"
            columnCount={columnCount}
            columnWidth={size.width / columnCount}
            height={height}
            itemData={{ products, columnCount, busyAction, onAddToCart }}
            onItemsRendered={handleItemsRendered}
            rowCount={rowCount}
            rowHeight={CARD_HEIGHT}
            width={size.width}
          >
            {Cell}
          </FixedSizeGrid>
        ) : null}
      </div>

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            disabled={isFetchingNextPage}
            onClick={onLoadMore}
            type="button"
            variant="secondary"
          >
            {isFetchingNextPage ? "Loading more..." : "Load more products"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
