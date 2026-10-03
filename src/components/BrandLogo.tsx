import { cn } from "@/lib/utils";

/**
 * Single source for the brand mark across the app.
 * Single approved ATHAT identity used across web, PWA, documents and Android.
 */
export const BRAND_LOGO_SRC = "/athat-logo-final.png?v=20261003-brand";

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
