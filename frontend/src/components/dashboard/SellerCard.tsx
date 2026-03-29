import { currencyFormatter } from "../../lib/api";
import type { SellerSummary } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

/**
 * Summary card for seller identity and business metrics.
 */
export type SellerCardProps = {
  seller: SellerSummary;
};

export function SellerCard({ seller }: SellerCardProps) {
  return (
    <Card
      description="Profile and operational metrics derived from seller-scoped hooks."
      eyebrow="Seller"
      role="region"
      title={seller.name}
    >
      <div className="flex flex-wrap gap-2">
        <Badge variant="info">{seller.role}</Badge>
        <Badge variant="success">{seller.activeListings} active listings</Badge>
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="surface-muted px-4 py-4">
          <dt className="text-label">Email</dt>
          <dd className="mt-2 text-sm font-semibold text-ink">{seller.email}</dd>
        </div>
        <div className="surface-muted px-4 py-4">
          <dt className="text-label">Products</dt>
          <dd className="mt-2 text-sm font-semibold text-ink">{seller.productCount}</dd>
        </div>
        <div className="surface-muted px-4 py-4">
          <dt className="text-label">Orders</dt>
          <dd className="mt-2 text-sm font-semibold text-ink">{seller.orderCount}</dd>
        </div>
        <div className="surface-muted px-4 py-4">
          <dt className="text-label">Revenue</dt>
          <dd className="mt-2 text-sm font-semibold text-ink">{currencyFormatter.format(seller.revenue)}</dd>
        </div>
      </dl>
    </Card>
  );
}
