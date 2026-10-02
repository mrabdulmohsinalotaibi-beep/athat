import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Single source for the brand mark. Drop the official PNG at public/brand-logo.png
 * and every screen picks it up; until then it falls back to the current asset.
 */
export const BRAND_LOGO_SRC = "/brand-logo.png";
export const BRAND_LOGO_FALLBACK = "/brand-final.png";

export function BrandLogo({ className, alt = "شعار الذات" }: { className?: string; alt?: string }) {
  const [src, setSrc] = useState(BRAND_LOGO_SRC);
  return (
    <img
      src={src}
      alt={alt}
      onError={() => src !== BRAND_LOGO_FALLBACK && setSrc(BRAND_LOGO_FALLBACK)}
      className={cn("block object-contain", className)}
      decoding="async"
    />
  );
}
