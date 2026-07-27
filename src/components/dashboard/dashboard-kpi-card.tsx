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
        "group relative flex min-h-[212px] flex-col overflow-hidden rounded-[18px] bg-card px-6 py-6 shadow-card sm:min-h-[228px] sm:px-7 sm:py-7",
        "transition-shadow duration-300 ease-out hover:shadow-card-hover",
        className
      )}
    >
      <span
        className={cn(
          "relative z-[1] flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
          palette.iconWrap,
          palette.icon
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.65} />
      </span>

      <div className="relative z-[1] mt-5 min-w-0 flex-1">
        <p className="whitespace-nowrap text-[1.85rem] font-bold leading-none tracking-tight text-[var(--brand-navy)] tabular-nums sm:text-[2.1rem]">
          {value}
        </p>
        <p className="mt-3.5 text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--brand-navy)]/55 sm:text-[13px]">
          {title}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>
      </div>

      <div className="relative z-[1] mt-5 flex items-end justify-between gap-3">
        {hasTrend ? (
          <p
            className={cn(
              "inline-flex items-center gap-0.5 text-[13px] font-bold",
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

        <div className="h-11 w-[52%] opacity-75 transition-opacity duration-300 group-hover:opacity-100 sm:h-12">
          <DashboardSparkline
            values={sparklineValues}
            stroke={palette.stroke}
            fillOpacity={0.16}
            className="h-full w-full"
          />
        </div>
      </div>
    </article>
  );
}
