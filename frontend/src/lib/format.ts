export const STORE_LOCALE = "es-MX";
export const STORE_CURRENCY_CODE = "MXN";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat(STORE_LOCALE, {
    style: "currency",
    currency: STORE_CURRENCY_CODE,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function clampText(value: string, max = 120) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trim()}...`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
