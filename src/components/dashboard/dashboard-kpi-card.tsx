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

/** TR Control palette accents — visual only */
const accentStyles: Record<
  KpiAccent,
  { iconWrap: string; icon: string; stroke: string }
> = {
  navy: {
    iconWrap: "bg-[#11203b]/12 ring-1 ring-inset ring-[#11203b]/14",
    icon: "text-[#11203b]",
    stroke: "#11203b",
  },
  coral: {
    iconWrap: "bg-[#c05c7d]/14 ring-1 ring-inset ring-[#c05c7d]/16",
    icon: "text-[#c05c7d]",
    stroke: "#c05c7d",
  },
  gold: {
    iconWrap: "bg-[#c89b3c]/16 ring-1 ring-inset ring-[#c89b3c]/18",
    icon: "text-[#c89b3c]",
    stroke: "#c89b3c",
  },
  teal: {
    iconWrap: "bg-[#1e4a7a]/12 ring-1 ring-inset ring-[#1e4a7a]/14",
    icon: "text-[#1e4a7a]",
    stroke: "#1e4a7a",
  },
  sky: {
    iconWrap: "bg-[#b6b6b6]/22 ring-1 ring-inset ring-[#b6b6b6]/28",
    icon: "text-[#7a7a7a]",
    stroke: "#b6b6b6",
  },
  emerald: {
    iconWrap: "bg-emerald-600/14 ring-1 ring-inset ring-emerald-600/16",
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
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.15} />
        </span>

        {hasTrend ? (
          <p
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[12px] font-extrabold tabular-nums tracking-tight",
              trendUp
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
                : "bg-[#e8c9d1]/55 text-[#c05c7d] ring-1 ring-inset ring-[#c05c7d]/25"
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
        ) : null}
      </div>

      <div className="relative z-[1] mt-5 min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#11203b]/68">
          {title}
        </p>
        <p className="mt-2.5 break-words text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.025em] text-[#11203b] tabular-nums sm:text-[1.95rem] lg:text-[2.05rem]">
          {value}
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground">{hint}</p>
      </div>

      <div className="relative z-[1] mt-5 h-12 opacity-90 transition-opacity duration-300 group-hover:opacity-100 sm:h-[52px]">
        <DashboardSparkline
          values={sparklineValues}
          stroke={palette.stroke}
          fillOpacity={0.26}
          className="h-full w-full"
        />
      </div>
    </article>
  );
}
