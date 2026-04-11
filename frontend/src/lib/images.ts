import type { SyntheticEvent } from "react";

export const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";

export function applyImageFallback(event: SyntheticEvent<HTMLImageElement>): void;
export function applyImageFallback(event: Event): void;
export function applyImageFallback(event: SyntheticEvent<HTMLImageElement> | Event) {
  const image = event.currentTarget as HTMLImageElement | null;

  if (!(image instanceof HTMLImageElement)) {
    return;
  }

  if (image.dataset.fallbackApplied === "true") {
    return;
  }

  image.dataset.fallbackApplied = "true";
  image.src = DEFAULT_PRODUCT_IMAGE;
}
