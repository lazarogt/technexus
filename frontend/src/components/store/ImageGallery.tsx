import { useState } from "react";
import { applyImageFallback, DEFAULT_PRODUCT_IMAGE } from "@/lib/images";

type ImageGalleryProps = {
  images: string[];
  productName: string;
};

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const safeImages =
    images.length > 0
      ? images
      : [DEFAULT_PRODUCT_IMAGE];

  return (
    <div className="image-gallery">
      <img
        className="image-gallery-main"
        src={safeImages[selected]}
        alt={productName}
        loading="eager"
        fetchPriority="high"
        onError={applyImageFallback}
      />
      <div className="image-gallery-thumbs">
        {safeImages.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className={index === selected ? "is-active" : undefined}
            onClick={() => setSelected(index)}
          >
            <img
              src={image}
              alt={`${productName} vista ${index + 1}`}
              loading="lazy"
              decoding="async"
              onError={applyImageFallback}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
