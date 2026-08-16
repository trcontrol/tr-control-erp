import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME, ROUTES } from "@/lib/constants";

type BrandLogoProps = {
  /** Visual context for contrast against light or navy surfaces */
  variant?: "light" | "on-navy";
  className?: string;
  priority?: boolean;
};

/**
 * Official TR Control ERP logo.
 * Uses trimmed display asset (whitespace removed) so the mark reads larger
 * in the header without changing brand identity.
 * Source mark: /public/brand/logo-tr-control-erp.png
 * Display: /public/brand/logo-tr-control-erp-display.png (922×339)
 */
export function BrandLogo({
  variant = "light",
  className,
  priority = false,
}: BrandLogoProps) {
  const isHeader = variant === "light";

  return (
    <Link
      href={ROUTES.home}
      className={cn(
        "inline-flex shrink-0 items-center overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2",
        variant === "on-navy" &&
          "rounded-lg bg-white/95 p-1 shadow-sm ring-1 ring-white/20",
        className
      )}
      aria-label={`${APP_NAME} — início`}
    >
      <Image
        src="/brand/logo-tr-control-erp-display.png"
        alt={`${APP_NAME} — Gestão que impulsiona.`}
        width={922}
        height={339}
        priority={priority}
        className={cn(
          "w-auto object-contain object-left",
          isHeader
            ? "h-16 sm:h-[4.5rem] lg:h-[5.25rem]"
            : "h-11 sm:h-12"
        )}
      />
    </Link>
  );
}
