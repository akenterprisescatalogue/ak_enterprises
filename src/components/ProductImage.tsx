"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

export function ProductImage({
  src,
  alt,
  className = ""
}: {
  src: string | undefined;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return (
      <div className={`product-image-fallback ${className}`} aria-label={alt}>
        <ImageIcon size={28} aria-hidden="true" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

