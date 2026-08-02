"use client";

import { useId, useMemo } from "react";
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
  toNumberAmount,
  type SalesReportSeriesPoint,
} from "@/lib/reports/format";

type SalesReportChartProps = {
  series: SalesReportSeriesPoint[];
  daily: boolean;
  averageTicket?: number;
};

type ChartPoint = {
  bucket: string;
  label: string;
  total: number;
  count: number;
};

const TR = {
  navy: "#11203b",
  rosa: "#c05c7d",
  rosaForte: "#a84568",
  rosaClaro: "#e8c9d1",
  dourado: "#c89b3c",
  cinza: "#b6b6b6",
} as const;

type TooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    value?: number | string;
    payload?: ChartPoint;
  }>;
};

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    })}k`;
  }
  return formatCurrency(value);
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const total = Number(payload[0]?.value ?? 0);
  const count = Number(point?.count ?? 0);

  return (
    <div className="rounded-xl border border-[#11203b]/[0.08] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgb(17_32_59/0.1)]">
      <p className="text-[11px] font-semibold tracking-wide text-[#c89b3c]">
        {String(label ?? "")}
      </p>
      <p className="mt-1 text-[13px] font-extrabold tabular-nums tracking-tight text-[#11203b]">
        {formatCurrency(total)}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-[#11203b]/55">
        {count} venda{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function SalesReportChart({
  series,
  daily,
  averageTicket,
}: SalesReportChartProps) {
  const isMobile = useIsMobile();
  const gradientUid = useId().replace(/:/g, "");
  const gradientId = `report-sales-bar-${gradientUid}`;

  const data = useMemo<ChartPoint[]>(
    () =>
      series.map((point) => ({
        bucket: point.bucket,
        label: seriesPointLabel(point.bucket, daily),
        total: toNumberAmount(point.total),
        count: point.count,
      })),
    [daily, series]
  );

  const periodTotal = useMemo(
    () => data.reduce((sum, point) => sum + point.total, 0),
    [data]
  );

  const chartHeight = isMobile ? 220 : 280;

  if (!data.length) {
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
    <div className="w-full min-w-0 space-y-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[15px] font-extrabold tabular-nums tracking-tight text-[#11203b] sm:text-[16px]">
          {formatCurrency(periodTotal)}
        </span>
        {averageTicket !== undefined ? (
          <span className="text-[11px] font-medium tabular-nums text-[#11203b]/42">
            <span className="text-[#c89b3c]/65">·</span> Ticket médio{" "}
            <span className="font-semibold text-[#11203b]/50">
              {formatCurrency(averageTicket)}
            </span>
          </span>
        ) : null}
      </div>

      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={
              isMobile
                ? { top: 10, right: 2, left: 0, bottom: 4 }
                : { top: 18, right: 8, left: 4, bottom: 10 }
            }
            barCategoryGap={isMobile ? "28%" : "34%"}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TR.rosaForte} />
                <stop offset="55%" stopColor={TR.rosa} />
                <stop offset="100%" stopColor={TR.rosaClaro} />
              </linearGradient>
            </defs>
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
              width={isMobile ? 40 : 58}
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: isMobile ? 9 : 10,
                fill: TR.cinza,
                fontWeight: 500,
              }}
              tickFormatter={(value: number) => formatCompactCurrency(value)}
            />
            <Tooltip
              cursor={{ fill: "rgb(192 92 125 / 6%)", radius: 8 }}
              content={<ChartTooltip />}
              isAnimationActive={false}
            />
            <Bar
              dataKey="total"
              radius={[10, 10, 4, 4]}
              maxBarSize={isMobile ? 22 : 34}
              fill={`url(#${gradientId})`}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
              activeBar={{
                fill: TR.rosa,
                stroke: TR.navy,
                strokeWidth: 1.25,
              }}
            >
              {data.map((point) => (
                <Cell key={point.bucket} fill={`url(#${gradientId})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
