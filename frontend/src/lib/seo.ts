import type { Product } from "@/features/api/types";
import { STORE_CURRENCY_CODE, clampText } from "@/lib/format";

const DEFAULT_SITE_URL = "http://localhost:3000";
const DEFAULT_OG_IMAGE =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";

function getConfiguredSiteUrl() {
  const configuredUrl = import.meta.env.VITE_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  return DEFAULT_SITE_URL;
}

export function toAbsoluteUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, getConfiguredSiteUrl()).toString();
}

export function getDefaultSeoImage(image?: string) {
  return toAbsoluteUrl(image || DEFAULT_OG_IMAGE);
}

export function buildProductJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.length > 0 ? product.images.map((image) => toAbsoluteUrl(image)) : [getDefaultSeoImage()],
    description: clampText(product.description, 160),
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: STORE_CURRENCY_CODE,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };
}
