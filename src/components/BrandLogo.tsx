import { cn } from "@/lib/utils";

/**
 * Single source for the brand mark across the app.
 * When the official PNG is added to public/, change only this path.
 */
export const BRAND_LOGO_SRC = "/brand-final.svg?v=20261001-finalbrandbrand";

export function BrandLogo({ className, alt = "شعار الذات" }: { className?: string; alt?: string }) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt={alt}
      className={cn("block object-contain", className)}
      decoding="async"
    />
  );
}
