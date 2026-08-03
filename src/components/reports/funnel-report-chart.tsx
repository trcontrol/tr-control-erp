"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  formatCurrency,
  seriesPointLabel,
  type FunnelReportCreatedSeriesPoint,
  type FunnelReportStageRow,
} from "@/lib/reports/format";

type FunnelDistributionChartProps = {
  stages: FunnelReportStageRow[];
  lostSummary: FunnelReportStageRow;
};

type FunnelCreatedSeriesChartProps = {
  series: FunnelReportCreatedSeriesPoint[];
  daily: boolean;
};

type CreatedPoint = {
  bucket: string;
  label: string;
  createdCount: number;
};

const TR = {
  navy: "#11203b",
  cinza: "#b6b6b6",
} as const;

type DistributionTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: FunnelReportStageRow;
  }>;
};

type CreatedTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    value?: number | string;
  }>;
};

function DistributionTooltip({ active, payload }: DistributionTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-[#11203b]/[0.08] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgb(17_32_59/0.1)]">
      <p className="text-[11px] font-semibold tracking-wide text-[#c89b3c]">
        {point.label}
      </p>
      <p className="mt-1 text-[13px] font-extrabold tabular-nums tracking-tight text-[#11203b]">
        {point.count} oportunidade{point.count === 1 ? "" : "s"}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-[#11203b]/55">
        {point.percent}% do total · {formatCurrency(point.totalValue)}
      </p>
    </div>
  );
}

function CreatedTooltip({ active, payload, label }: CreatedTooltipProps) {
  if (!active || !payload?.length) return null;
  const count = Number(payload[0]?.value ?? 0);

  return (
    <div className="rounded-xl border border-[#11203b]/[0.08] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgb(17_32_59/0.1)]">
      <p className="text-[11px] font-semibold tracking-wide text-[#c89b3c]">
        {String(label ?? "")}
      </p>
      <p className="mt-1 text-[12px] font-medium text-[#11203b]/70">
        Criadas:{" "}
        <span className="font-extrabold tabular-nums text-[#11203b]">
          {count}
        </span>
      </p>
    </div>
  );
}

export function FunnelDistributionChart({
  stages,
  lostSummary,
}: FunnelDistributionChartProps) {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 320 : 360;

  const data = stages;
  const totalInStages = stages.reduce((sum, stage) => sum + stage.count, 0);
  const hasData = totalInStages > 0 || lostSummary.count > 0;

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height: chartHeight }}
      >
        Sem dados para o gráfico no período selecionado.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={
              isMobile
                ? { top: 4, right: 16, left: 4, bottom: 4 }
                : { top: 8, right: 24, left: 8, bottom: 8 }
            }
            barCategoryGap={isMobile ? "18%" : "22%"}
          >
            <CartesianGrid
              strokeDasharray="2 12"
              horizontal={false}
              stroke="rgb(17 32 59 / 3.5%)"
            />
            <XAxis
              type="number"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: isMobile ? 9 : 10,
                fill: TR.cinza,
                fontWeight: 500,
              }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={isMobile ? 96 : 128}
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: isMobile ? 10 : 11,
                fill: TR.navy,
                fontWeight: 500,
              }}
            />
            <Tooltip
              cursor={{ fill: "rgb(17 32 59 / 4%)", radius: 8 }}
              content={<DistributionTooltip />}
              isAnimationActive={false}
            />
            <Bar
              dataKey="count"
              name="Oportunidades"
              radius={[0, 10, 10, 0]}
              maxBarSize={isMobile ? 18 : 24}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
            >
              {data.map((point) => (
                <Cell key={point.stage} fill={point.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage, index) => (
          <div
            key={stage.stage}
            className="rounded-xl border border-[var(--brand-navy)]/6 bg-[var(--brand-surface-soft)]/50 px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: stage.color }}
                aria-hidden
              />
              <p className="min-w-0 truncate text-[11px] font-medium text-[var(--brand-navy)]/70">
                <span className="tabular-nums text-[var(--brand-navy)]/35">
                  {index + 1}.
                </span>{" "}
                {stage.label}
              </p>
            </div>
            <p className="mt-1.5 text-[13px] font-extrabold tabular-nums text-[var(--brand-navy)]">
              {stage.count}
              <span className="ml-1.5 text-[11px] font-semibold text-[var(--brand-navy)]/45">
                {stage.percent}%
              </span>
            </p>
            <p className="mt-0.5 text-[11px] tabular-nums text-[var(--brand-navy)]/50">
              {formatCurrency(stage.totalValue)}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: lostSummary.color }}
              aria-hidden
            />
            <p className="text-sm font-semibold text-[var(--brand-navy)]">
              {lostSummary.label}
            </p>
            <span className="text-xs text-muted-foreground">
              fora da sequência principal
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-extrabold tabular-nums text-[var(--brand-navy)]">
              {lostSummary.count}
              <span className="ml-1.5 text-xs font-semibold text-[var(--brand-navy)]/45">
                {lostSummary.percent}%
              </span>
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatCurrency(lostSummary.totalValue)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FunnelCreatedSeriesChart({
  series,
  daily,
}: FunnelCreatedSeriesChartProps) {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 220 : 280;

  const data = useMemo<CreatedPoint[]>(
    () =>
      series.map((point) => ({
        bucket: point.bucket,
        label: seriesPointLabel(point.bucket, daily),
        createdCount: point.createdCount,
      })),
    [daily, series]
  );

  const totalCreated = data.reduce((sum, point) => sum + point.createdCount, 0);

  if (!data.length || totalCreated === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height: chartHeight }}
      >
        Sem oportunidades criadas no período selecionado.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[15px] font-extrabold tabular-nums tracking-tight text-[#11203b] sm:text-[16px]">
          {totalCreated} criada{totalCreated === 1 ? "" : "s"}
        </span>
        <span className="text-[11px] font-medium text-[#11203b]/42">
          <span className="text-[#c89b3c]/65">·</span>{" "}
          {daily ? "agregação diária" : "agregação mensal"}
        </span>
      </div>

      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={
              isMobile
                ? { top: 10, right: 8, left: 0, bottom: 4 }
                : { top: 18, right: 12, left: 4, bottom: 10 }
            }
            barCategoryGap={isMobile ? "28%" : "34%"}
          >
            <CartesianGrid
              strokeDasharray="2 12"
              vertical={false}
              stroke="rgb(17 32 59 / 3.5%)"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: isMobile ? 10 : 11,
                fill: TR.cinza,
                fontWeight: 500,
              }}
              tickMargin={isMobile ? 8 : 12}
              interval="preserveStartEnd"
              minTickGap={isMobile ? 4 : 8}
            />
            <YAxis
              width={isMobile ? 28 : 36}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: isMobile ? 9 : 10,
                fill: TR.cinza,
                fontWeight: 500,
              }}
            />
            <Tooltip
              cursor={{ fill: "rgb(17 32 59 / 4%)", radius: 8 }}
              content={<CreatedTooltip />}
              isAnimationActive={false}
            />
            <Bar
              dataKey="createdCount"
              name="Oportunidades criadas"
              fill={TR.navy}
              radius={[10, 10, 4, 4]}
              maxBarSize={isMobile ? 22 : 34}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
