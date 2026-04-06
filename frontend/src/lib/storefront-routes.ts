import type { Category, Product } from "@/features/api/types";
import { slugify } from "@/lib/format";

const UUID_SUFFIX_PATTERN =
  /([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function extractStorefrontEntityId(param: string) {
  const normalizedParam = param.trim();

  if (!normalizedParam) {
    return "";
  }

  const uuidMatch = normalizedParam.match(UUID_SUFFIX_PATTERN);

  if (uuidMatch) {
    return uuidMatch[1];
  }

  const lastHyphenIndex = normalizedParam.lastIndexOf("-");

  if (lastHyphenIndex > 0 && lastHyphenIndex < normalizedParam.length - 1) {
    return normalizedParam.slice(lastHyphenIndex + 1);
  }

  return normalizedParam;
}

export function buildCategoryPath(category: Pick<Category, "id" | "name">) {
  return `/category/${slugify(category.name)}-${category.id}`;
}

export function buildProductPath(product: Pick<Product, "id" | "name">) {
  return `/product/${slugify(product.name)}-${product.id}`;
}
