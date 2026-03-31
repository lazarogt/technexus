import { Button } from "@/components/shared/Button";
import type { Product } from "@/features/api/types";
import { formatCurrency } from "@/lib/format";

type BuyBoxProps = {
  product: Product;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAddToCart: () => void;
};

export function BuyBox({ product, quantity, onQuantityChange, onAddToCart }: BuyBoxProps) {
  return (
    <aside className="buy-box">
      <p className="buy-box-price">{formatCurrency(product.price)}</p>
      <p className={product.stock > 0 ? "buy-box-stock is-available" : "buy-box-stock is-empty"}>
        {product.stock > 0 ? `Disponible: ${product.stock}` : "Sin stock"}
      </p>
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
      <p className="buy-box-note">Pago contra entrega, confirmación por correo y actualización automática de stock.</p>
    </aside>
  );
}
