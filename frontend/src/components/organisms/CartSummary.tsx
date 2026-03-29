import { memo } from "react";
import { FixedSizeList, type ListChildComponentProps } from "react-window";
import { currencyFormatter, toAssetUrl } from "../../lib/api";
import { useElementSize } from "../../hooks/useElementSize";
import type { CartSummary as CartSummaryType, GroupedCartSeller } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type CartSummaryProps = {
  groups: GroupedCartSeller[];
  cart: CartSummaryType;
  shippingCost: number;
  onRemoveItem?: (productId: string) => void;
  busyProductId?: string | null;
};

type CartRowData = {
  items: GroupedCartSeller["items"];
  busyProductId: string | null;
  onRemoveItem?: (productId: string) => void;
};

function CartItemRow({ index, style, data }: ListChildComponentProps<CartRowData>) {
  const item = data.items[index];
  const image = item.productImages[0] ? toAssetUrl(item.productImages[0]) : null;
  const isBusy = data.busyProductId === item.productId;

  return (
    <div className="py-1" style={style}>
      <div className="grid gap-3 rounded-[22px] bg-mist p-4 sm:grid-cols-[88px_minmax(0,1fr)_auto]">
        <div className="aspect-square overflow-hidden rounded-2xl bg-white">
          {image ? (
            <img
              alt={item.productName}
              className="h-full w-full object-cover"
              src={image}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate">No image</div>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-display text-lg font-bold text-ink">{item.productName}</h4>
          <p className="mt-1 text-sm text-slate">{item.productDescription}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate">
            <Badge variant="info">Qty {item.quantity}</Badge>
            <Badge variant="info">Unit {currencyFormatter.format(item.productPrice)}</Badge>
            <Badge variant={item.productStock > 0 ? "success" : "warning"}>
              {item.productStock > 0 ? `${item.productStock} stock` : "No stock"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="text-lg font-bold text-ember">{currencyFormatter.format(item.subtotal)}</p>
          {data.onRemoveItem ? (
            <Button
              aria-label={`Remove ${item.productName} from cart`}
              disabled={isBusy}
              onClick={() => data.onRemoveItem?.(item.productId)}
              type="button"
              variant="secondary"
            >
              {isBusy ? "Removing..." : "Remove"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type SellerCartGroupProps = {
  group: GroupedCartSeller;
  busyProductId: string | null;
  onRemoveItem?: (productId: string) => void;
};

function SellerCartGroup({ group, busyProductId, onRemoveItem }: SellerCartGroupProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  return (
    <Card role="region" title={group.sellerName} eyebrow="Seller">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate">
          Seller total: {currencyFormatter.format(group.subtotal)}
        </p>
      </div>

      <div className="mt-5" ref={ref}>
        {size.width > 0 ? (
          <FixedSizeList
            height={Math.min(420, Math.max(180, group.items.length * 148))}
            itemCount={group.items.length}
            itemData={{
              items: group.items,
              busyProductId,
              onRemoveItem
            }}
            itemSize={148}
            width={size.width}
          >
            {CartItemRow}
          </FixedSizeList>
        ) : null}
      </div>
    </Card>
  );
}

function CartSummaryComponent({
  groups,
  cart,
  shippingCost,
  onRemoveItem,
  busyProductId
}: CartSummaryProps) {
  const overallTotal = cart.total + shippingCost;

  return (
    <section aria-label="Cart summary" className="space-y-4">
      {groups.map((group) => (
        <SellerCartGroup
          busyProductId={busyProductId ?? null}
          group={group}
          key={group.sellerId}
          onRemoveItem={onRemoveItem}
        />
      ))}

      <Card role="region" title="Totals">
        <div className="mt-4 space-y-3 text-sm text-slate">
          <div className="flex items-center justify-between">
            <span>Products subtotal</span>
            <strong className="text-ink">{currencyFormatter.format(cart.total)}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <strong className="text-ink">{currencyFormatter.format(shippingCost)}</strong>
          </div>
          <div className="flex items-center justify-between border-t border-black/10 pt-3 text-base">
            <span className="font-semibold text-ink">Order total</span>
            <strong className="font-display text-2xl text-ember">
              {currencyFormatter.format(overallTotal)}
            </strong>
          </div>
        </div>
      </Card>
    </section>
  );
}

export const CartSummary = memo(CartSummaryComponent);
