import { cn } from "@/lib/utils";

/**
 * Single source for the brand mark across the app.
 * Approved counseling identity used across the application.
 */
export const BRAND_LOGO_SRC = "/athat-icon-hq.webp?v=20261002-palette";

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
