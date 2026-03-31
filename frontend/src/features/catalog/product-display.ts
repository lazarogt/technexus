export type StockTone = "in-stock" | "low-stock" | "out-of-stock";

export function getStockLabel(stock: number) {
  if (stock <= 0) {
    return {
      tone: "out-of-stock" as StockTone,
      label: "Sin stock",
      urgency: "Este producto volvera pronto."
    };
  }

  if (stock <= 5) {
    return {
      tone: "low-stock" as StockTone,
      label: "Pocas unidades",
      urgency: `Solo quedan ${stock} unidades`
    };
  }

  return {
    tone: "in-stock" as StockTone,
    label: "En stock",
    urgency: "Entrega disponible con pago contra entrega"
  };
}

export function getPromoBadge(badge?: string) {
  if (badge) {
    return badge;
  }

  return null;
}
