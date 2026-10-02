import { cn } from "@/lib/utils";

/**
 * Single source for the brand mark across the app.
 * Approved counseling identity used across the application.
 */
export const BRAND_LOGO_SRC = "/brand-approved.webp?v=20261002-approved";

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
