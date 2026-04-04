import { Button } from "@/components/shared/Button";
import type { Product } from "@/features/api/types";
import { getStockLabel } from "@/features/catalog/product-display";
import { ES } from "@/i18n/es";
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
      <p className="section-eyebrow">{ES.product.buyBoxEyebrow}</p>
      <p className="buy-box-price">{formatCurrency(product.price)}</p>
      <p className={`buy-box-stock is-${stock.tone}`}>{stock.label}</p>
      <p className="buy-box-urgency">{stock.urgency}</p>
      <div className="buy-box-delivery">
        <strong>{ES.product.deliveryTitle}</strong>
        <span>{ES.product.deliveryEta}</span>
      </div>
      <label className="field">
        <span className="field-label">{ES.labels.quantity}</span>
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
        {ES.buttons.addToCart}
      </Button>
      <Button variant="secondary" fullWidth onClick={onAddToCart} disabled={product.stock <= 0}>
        {ES.buttons.buyNow}
      </Button>
      <ul className="buy-box-trust-list">
        {ES.product.buyBoxTrustPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="buy-box-note">{ES.product.liveCatalogNote}</p>
    </aside>
  );
}
