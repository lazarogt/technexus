import { Button } from "@/components/shared/Button";
import type { Product } from "@/features/api/types";
import { getStockLabel } from "@/features/catalog/product-display";
import { formatCurrency } from "@/lib/format";

type BuyBoxProps = {
  product: Product;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAddToCart: () => void;
};

export function BuyBox({ product, quantity, onQuantityChange, onAddToCart }: BuyBoxProps) {
  const stock = getStockLabel(product.stock);

  return (
    <aside className="buy-box" data-testid="buybox">
      <p className="section-eyebrow">Fast checkout</p>
      <p className="buy-box-price">{formatCurrency(product.price)}</p>
      <p className={`buy-box-stock is-${stock.tone}`}>{stock.label}</p>
      <p className="buy-box-urgency">{stock.urgency}</p>
      <div className="buy-box-delivery">
        <strong>Ships with delivery confirmation</strong>
        <span>Estimated arrival between tomorrow and the next 48 business hours.</span>
      </div>
      <label className="field">
        <span className="field-label">Quantity</span>
        <input
          className="field-input"
          data-testid="buybox-quantity"
          type="number"
          min={1}
          max={Math.max(1, product.stock)}
          value={quantity}
          onChange={(event) => onQuantityChange(Number(event.target.value))}
        />
      </label>
      <Button data-testid="buybox-add-to-cart" onClick={onAddToCart} disabled={product.stock <= 0} fullWidth>
        Add to Cart
      </Button>
      <Button variant="secondary" fullWidth onClick={onAddToCart} disabled={product.stock <= 0}>
        Buy Now
      </Button>
      <ul className="buy-box-trust-list">
        <li>Secure purchase flow</li>
        <li>Seller visibility on every order</li>
        <li>Support available before and after purchase</li>
      </ul>
      <p className="buy-box-note">Stock, price and rating are synced from the live storefront catalog.</p>
    </aside>
  );
}
