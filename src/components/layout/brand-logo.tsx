import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** When true, show only the official symbol badge (collapsed sidebar). */
  compact?: boolean;
};

/**
 * Official sidebar badge — gold frame + navy interior in the asset.
 * Outer white corners removed as real alpha (v4).
 */
const SYMBOL_SRC = "/brand/symbol-tr-control-erp-sidebar-v4.png";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-16 w-16 shrink-0 items-center justify-center",
        className
      )}
      aria-hidden
    >
      <Image
        src={SYMBOL_SRC}
        alt=""
        width={1024}
        height={1024}
        unoptimized
        priority
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <BrandMark />
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandMark />
      <div className="min-w-0">
        <p className="font-display text-[1.12rem] font-semibold leading-none tracking-tight text-white lg:text-[1.18rem]">
          TR Control{" "}
          <span className="font-sans text-[0.72em] font-semibold tracking-[0.04em] text-[var(--brand-coral)]">
            ERP
          </span>
        </p>
        <p className="mt-1.5 truncate text-[11px] font-medium leading-none text-[var(--brand-gold-soft)]/90">
          Gestão empresarial
        </p>
      </div>
    </div>
  );
}
