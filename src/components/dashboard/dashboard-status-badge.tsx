"use client";

import { cn } from "@/lib/utils";

type DashboardStatusBadgeProps = {
  label: string;
  tone?: "neutral" | "positive" | "negative" | "warning" | "info";
  className?: string;
};

const toneClass: Record<
  NonNullable<DashboardStatusBadgeProps["tone"]>,
  string
> = {
  neutral: "bg-muted text-muted-foreground",
  positive: "bg-emerald-50 text-emerald-700",
  negative: "bg-[var(--brand-coral)]/10 text-[var(--brand-coral)]",
  warning: "bg-amber-50 text-amber-800",
  info: "bg-sky-50 text-sky-800",
};

export function DashboardStatusBadge({
  label,
  tone = "neutral",
  className,
}: DashboardStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium",
        toneClass[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
