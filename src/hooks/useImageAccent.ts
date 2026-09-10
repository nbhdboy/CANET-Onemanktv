"use client";

import { useEffect, useState } from "react";
import { extractAccentFromImage, type ImageAccent } from "@/lib/color/image-accent";

export function useImageAccent(
  imageUrl: string | null | undefined,
  fallback: ImageAccent,
): ImageAccent {
  const [accent, setAccent] = useState<ImageAccent>(fallback);

  useEffect(() => {
    let cancelled = false;
    if (!imageUrl) {
      setAccent(fallback);
      return;
    }
    setAccent(fallback);
    extractAccentFromImage(imageUrl).then((next) => {
      if (!cancelled && next) setAccent(next);
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl, fallback.from, fallback.to]);

  return accent;
}
