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
    iconWrap: "bg-[var(--brand-navy)]",
    icon: "text-white",
    stroke: "var(--brand-navy)",
  },
  coral: {
    iconWrap: "bg-[var(--brand-coral)]",
    icon: "text-white",
    stroke: "var(--brand-coral)",
  },
  gold: {
    iconWrap: "bg-[var(--brand-gold)]",
    icon: "text-[var(--brand-navy-deep)]",
    stroke: "var(--brand-gold)",
  },
  teal: {
    iconWrap: "bg-[var(--brand-teal)]",
    icon: "text-white",
    stroke: "var(--brand-teal)",
  },
  sky: {
    iconWrap: "bg-[var(--brand-sky)]",
    icon: "text-white",
    stroke: "var(--brand-sky)",
  },
  emerald: {
    iconWrap: "bg-emerald-600",
    icon: "text-white",
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
        "group relative flex min-h-[168px] flex-col overflow-hidden rounded-[14px] bg-card p-5 shadow-card",
        "transition-shadow duration-300 ease-out hover:shadow-card-hover",
        className
      )}
    >
      <span
        className={cn(
          "relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          palette.iconWrap,
          palette.icon
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.7} />
      </span>

      <div className="relative z-[1] mt-4 min-w-0 flex-1">
        <p className="truncate text-[1.85rem] font-bold leading-none tracking-tight text-[var(--brand-navy)] tabular-nums">
          {value}
        </p>
        <p className="mt-2.5 truncate text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--brand-navy)]/50">
          {title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {hint}
        </p>
      </div>

      <div className="relative z-[1] mt-3 flex items-end justify-between gap-2">
        {hasTrend ? (
          <p
            className={cn(
              "inline-flex items-center gap-0.5 text-[12px] font-bold",
              trendUp ? "text-emerald-600" : "text-[var(--brand-coral)]"
            )}
          >
            {trendUp ? (
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
            {Math.abs(trendPercent).toLocaleString("pt-BR", {
              maximumFractionDigits: 0,
            })}
            %
          </p>
        ) : (
          <span />
        )}

        <div className="h-8 w-[46%] opacity-70 transition-opacity duration-300 group-hover:opacity-95">
          <DashboardSparkline
            values={sparklineValues}
            stroke={palette.stroke}
            fillOpacity={0.14}
            className="h-full w-full"
          />
        </div>
      </div>
    </article>
  );
}
