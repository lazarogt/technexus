import i18n from "@/i18n";

export type StockTone = "in-stock" | "low-stock" | "out-of-stock";

export function getStockLabel(stock: number) {
  if (stock <= 0) {
    return {
      tone: "out-of-stock" as StockTone,
      label: i18n.t("product.stock.out.label"),
      urgency: i18n.t("product.stock.out.urgency")
    };
  }

  if (stock <= 5) {
    return {
      tone: "low-stock" as StockTone,
      label: i18n.t("product.stock.low.label"),
      urgency: i18n.t("product.stock.low.urgency", { count: stock })
    };
  }

  return {
    tone: "in-stock" as StockTone,
    label: i18n.t("product.stock.available.label"),
    urgency: i18n.t("product.stock.available.urgency")
  };
}

export function getPromoBadge(badge?: string) {
  if (badge) {
    return badge;
  }

  return null;
}
