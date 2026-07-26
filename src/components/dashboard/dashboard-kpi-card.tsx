"use client";

import { DashboardSparkline } from "@/components/dashboard/dashboard-sparkline";
import { cn } from "@/lib/utils";

type DashboardKpiCardProps = {
  title: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  sparklineValues?: number[];
  sparklineStroke?: string;
  tone?: "default" | "positive" | "negative";
};

export function DashboardKpiCard({
  title,
  value,
  hint,
  icon: Icon,
  sparklineValues = [],
  sparklineStroke,
  tone = "default",
}: DashboardKpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--brand-navy)]/10 bg-card p-3 shadow-sm",
        "flex min-h-[104px] flex-col justify-between gap-2"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {title}
          </p>
          <p
            className={cn(
              "mt-1 truncate text-lg font-semibold tracking-tight text-[var(--brand-navy)]",
              tone === "positive" && "text-emerald-700",
              tone === "negative" && "text-[var(--brand-coral)]"
            )}
          >
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            "bg-[var(--brand-navy)]/5 text-[var(--brand-navy)]",
            tone === "positive" && "bg-emerald-50 text-emerald-700",
            tone === "negative" &&
              "bg-[var(--brand-coral)]/10 text-[var(--brand-coral)]"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="space-y-1">
        <DashboardSparkline
          values={sparklineValues}
          stroke={
            sparklineStroke ??
            (tone === "positive"
              ? "#047857"
              : tone === "negative"
                ? "var(--brand-coral)"
                : "var(--brand-navy)")
          }
        />
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
