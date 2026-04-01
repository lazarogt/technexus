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
      <p className="section-eyebrow">Compra rapida</p>
      <p className="buy-box-price">{formatCurrency(product.price)}</p>
      <p className={`buy-box-stock is-${stock.tone}`}>{stock.label}</p>
      <p className="buy-box-urgency">{stock.urgency}</p>
      <div className="buy-box-delivery">
        <strong>Llega pronto a tu zona</strong>
        <span>Entrega estimada entre manana y 48 horas habiles.</span>
      </div>
      <label className="field">
        <span className="field-label">Cantidad</span>
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
        Agregar al carrito
      </Button>
      <Button variant="secondary" fullWidth onClick={onAddToCart} disabled={product.stock <= 0}>
        Comprar ahora
      </Button>
      <ul className="buy-box-trust-list">
        <li>Compra segura</li>
        <li>Pago contra entrega</li>
        <li>Soporte disponible</li>
      </ul>
      <p className="buy-box-note">Confirmacion por correo y stock sincronizado en tiempo real.</p>
    </aside>
  );
}
