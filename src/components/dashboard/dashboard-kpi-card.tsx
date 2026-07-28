"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { DashboardSparkline } from "@/components/dashboard/dashboard-sparkline";
import { cn } from "@/lib/utils";

export type KpiAccent =
  | "navy"
  | "coral"
  | "gold"
  | "teal"
  | "sky"
  | "emerald";

type DashboardKpiCardProps = {
  title: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  sparklineValues?: number[];
  accent?: KpiAccent;
  trendPercent?: number | null;
  tone?: "default" | "positive" | "negative";
  style?: React.CSSProperties;
  className?: string;
};

const accentStyles: Record<
  KpiAccent,
  { iconWrap: string; icon: string; stroke: string }
> = {
  navy: {
    iconWrap: "bg-[var(--brand-navy)]/[0.08]",
    icon: "text-[var(--brand-navy)]",
    stroke: "var(--brand-navy)",
  },
  coral: {
    iconWrap: "bg-[var(--brand-coral)]/15",
    icon: "text-[var(--brand-coral)]",
    stroke: "var(--brand-coral)",
  },
  gold: {
    iconWrap: "bg-[var(--brand-gold)]/15",
    icon: "text-[var(--brand-gold)]",
    stroke: "var(--brand-gold)",
  },
  teal: {
    iconWrap: "bg-[var(--brand-teal)]/12",
    icon: "text-[var(--brand-teal)]",
    stroke: "var(--brand-teal)",
  },
  sky: {
    iconWrap: "bg-[var(--brand-sky)]/12",
    icon: "text-[var(--brand-sky)]",
    stroke: "var(--brand-sky)",
  },
  emerald: {
    iconWrap: "bg-emerald-600/10",
    icon: "text-emerald-700",
    stroke: "#059669",
  },
};

export function DashboardKpiCard({
  title,
  value,
  hint,
  icon: Icon,
  sparklineValues = [],
  accent = "navy",
  trendPercent = null,
  style,
  className,
}: DashboardKpiCardProps) {
  const palette = accentStyles[accent];
  const hasTrend =
    typeof trendPercent === "number" && Number.isFinite(trendPercent);
  const trendUp = hasTrend && trendPercent >= 0;

  return (
    <article
      style={style}
      className={cn(
        "group relative flex min-h-[220px] flex-col overflow-hidden rounded-[20px] bg-card px-6 py-6 dash-surface-kpi sm:min-h-[236px] sm:px-7 sm:py-7",
        "transition-shadow duration-300 ease-out hover:shadow-kpi-hover",
        className
      )}
    >
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            palette.iconWrap,
            palette.icon
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.65} />
        </span>

        {hasTrend ? (
          <p
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[12px] font-bold tabular-nums",
              trendUp
                ? "bg-emerald-50 text-emerald-700"
                : "bg-[var(--brand-coral)]/12 text-[var(--brand-coral)]"
            )}
          >
            {trendUp ? (
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            )}
            {Math.abs(trendPercent).toLocaleString("pt-BR", {
              maximumFractionDigits: 0,
            })}
            %
          </p>
        ) : null}
      </div>

      <div className="relative z-[1] mt-5 min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--brand-navy)]/70">
          {title}
        </p>
        <p className="mt-2.5 break-words text-[1.75rem] font-bold leading-[1.1] tracking-tight text-[var(--brand-navy)] tabular-nums sm:text-[1.95rem] lg:text-[2.05rem]">
          {value}
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground">{hint}</p>
      </div>

      <div className="relative z-[1] mt-5 h-12 opacity-80 transition-opacity duration-300 group-hover:opacity-100 sm:h-[52px]">
        <DashboardSparkline
          values={sparklineValues}
          stroke={palette.stroke}
          fillOpacity={0.14}
          className="h-full w-full"
        />
      </div>
    </article>
  );
}
