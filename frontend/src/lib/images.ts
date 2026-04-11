export const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";

export function applyImageFallback(event: Event) {
  const image = event.currentTarget as HTMLImageElement;

  if (image.dataset.fallbackApplied === "true") {
    return;
  }

  image.dataset.fallbackApplied = "true";
  image.src = DEFAULT_PRODUCT_IMAGE;
}
