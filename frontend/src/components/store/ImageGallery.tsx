import { useState } from "react";

type ImageGalleryProps = {
  images: string[];
  productName: string;
};

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const safeImages =
    images.length > 0
      ? images
      : ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80"];

  return (
    <div className="image-gallery">
      <img className="image-gallery-main" src={safeImages[selected]} alt={productName} loading="lazy" />
      <div className="image-gallery-thumbs">
        {safeImages.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className={index === selected ? "is-active" : undefined}
            onClick={() => setSelected(index)}
          >
            <img src={image} alt={`${productName} vista ${index + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
