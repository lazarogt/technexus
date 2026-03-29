import { useEffect, useRef, useState } from "react";

type ElementSize = {
  width: number;
  height: number;
};

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
