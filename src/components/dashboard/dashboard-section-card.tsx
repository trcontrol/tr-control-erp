"use client";

import { cn } from "@/lib/utils";

export type DashboardCardAccent =
  | "blue"
  | "green"
  | "rose"
  | "purple"
  | "gold"
  | "navy"
  | "coral";

const accentBarClass: Record<DashboardCardAccent, string> = {
  blue: "bg-[#1e4a7a]",
  green: "bg-[#6a9e88]",
  rose: "bg-[#c05c7d]",
  purple: "bg-[#7b6aae]",
  gold: "bg-[var(--brand-gold)]",
  navy: "bg-[var(--brand-navy)]",
  coral: "bg-[var(--brand-coral)]",
};

type DashboardSectionCardProps = {
  title: string;
  description?: string;
  titleIcon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  style?: React.CSSProperties;
  elevation?: "primary" | "secondary";
  /** Barra colorida no topo do cartão (somente visual). */
  accent?: DashboardCardAccent;
};

export function DashboardSectionCard({
  title,
  description,
  titleIcon,
  action,
  children,
  className,
  contentClassName,
  headerClassName,
  titleClassName,
  style,
  elevation = "primary",
  accent,
}: DashboardSectionCardProps) {
  return (
    <section
      style={style}
      className={cn(
        "relative flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-[var(--brand-navy)]/[0.06] bg-card",
        elevation === "primary"
          ? "dash-surface-primary"
          : "dash-surface-secondary",
        "shadow-[0_2px_10px_rgb(17_32_59/0.04)]",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out",
        "hover:z-[1] hover:scale-[1.01] hover:border-[var(--brand-gold)]/35",
        "hover:shadow-[0_8px_24px_rgb(17_32_59/0.1),0_2px_8px_rgb(200_155_60/0.08)]",
        "motion-reduce:transition-none motion-reduce:hover:scale-100",
        className
      )}
    >
      {accent ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-[2] h-[3px]",
            accentBarClass[accent]
          )}
        />
      ) : null}
      <header
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-3.5 pb-2 pt-3.5 sm:gap-x-3 sm:px-5 sm:pb-2.5 sm:pt-4",
          headerClassName
        )}
      >
        <div className="min-w-0 flex-1 basis-[10rem] sm:basis-[12rem]">
          <div className="flex min-w-0 items-center gap-2">
            {titleIcon ? (
              <span className="inline-flex shrink-0 items-center justify-center">
                {titleIcon}
              </span>
            ) : null}
            <h2
              className={cn(
                "truncate text-left text-[15px] font-bold tracking-[-0.02em] text-[#0f1b33] sm:text-[16px]",
                titleClassName
              )}
            >
              {title}
            </h2>
          </div>
          {description ? (
            <p className="mt-1 text-left text-[12px] leading-relaxed text-[var(--brand-navy)]/60">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end">
            {action}
          </div>
        ) : null}
      </header>
      <div
        className={cn(
          "min-w-0 flex-1 px-3.5 pb-3.5 sm:px-5 sm:pb-4",
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
