import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-[var(--brand-navy-mid)] to-[var(--brand-navy-deep)]",
        "shadow-[0_6px_16px_rgb(0_0_0_/28%),inset_0_1px_0_rgb(255_255_255_/12%)]",
        "ring-1 ring-white/10",
        className
      )}
      aria-hidden
    >
      <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--brand-gold)] via-[var(--brand-gold-soft)] to-[var(--brand-gold)]" />
      <span className="font-display text-[13px] font-bold leading-none tracking-tight text-white">
        TR
      </span>
      <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[var(--brand-coral)]" />
    </span>
  );
}

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <BrandMark className={cn(compact && "h-10 w-10 rounded-[14px]")} />
      <div className="min-w-0">
        <p
          className={cn(
            "font-display font-semibold leading-none tracking-tight text-white",
            compact ? "text-[1.05rem]" : "text-[1.15rem] lg:text-[1.22rem]"
          )}
        >
          TR Control{" "}
          <span className="font-sans text-[0.72em] font-semibold tracking-[0.04em] text-[var(--brand-coral)]">
            ERP
          </span>
        </p>
        <p
          className={cn(
            "mt-1.5 truncate font-medium text-[var(--brand-gold-soft)]/90",
            compact ? "text-[10px]" : "text-[11px]"
          )}
        >
          Gestão empresarial
        </p>
      </div>
    </div>
  );
}
