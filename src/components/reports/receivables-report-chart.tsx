"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  type ReceivablesReportSeriesPoint,
} from "@/lib/reports/format";

type ReceivablesReportChartProps = {
  series: ReceivablesReportSeriesPoint[];
  daily: boolean;
  totalAReceber?: number;
};

type ChartPoint = {
  bucket: string;
  label: string;
  received: number;
  pending: number;
  overdue: number;
};

const TR = {
  navy: "#11203b",
  received: "#6f9f87",
  pending: "#c05c7d",
  overdue: "#c89b3c",
  cinza: "#b6b6b6",
} as const;

type TooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    dataKey?: string | number;
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
  const received = toNumberAmount(point?.received ?? 0);
  const pending = toNumberAmount(point?.pending ?? 0);
  const overdue = toNumberAmount(point?.overdue ?? 0);

  return (
    <div className="rounded-xl border border-[#11203b]/[0.08] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgb(17_32_59/0.1)]">
      <p className="text-[11px] font-semibold tracking-wide text-[#c89b3c]">
        {String(label ?? "")}
      </p>
      <div className="mt-1.5 space-y-0.5 text-[12px] font-medium tabular-nums">
        <p className="text-[#6f9f87]">Recebido {formatCurrency(received)}</p>
        <p className="text-[#c05c7d]">Pendente {formatCurrency(pending)}</p>
        <p className="text-[#c89b3c]">Em atraso {formatCurrency(overdue)}</p>
      </div>
    </div>
  );
}

export function ReceivablesReportChart({
  series,
  daily,
  totalAReceber,
}: ReceivablesReportChartProps) {
  const isMobile = useIsMobile();

  const data = useMemo<ChartPoint[]>(
    () =>
      series.map((point) => ({
        bucket: point.bucket,
        label: seriesPointLabel(point.bucket, daily),
        received: toNumberAmount(point.received),
        pending: toNumberAmount(point.pending),
        overdue: toNumberAmount(point.overdue),
      })),
    [daily, series]
  );

  const chartHeight = isMobile ? 240 : 300;

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
        {totalAReceber !== undefined ? (
          <>
            <span className="text-[15px] font-extrabold tabular-nums tracking-tight text-[#11203b] sm:text-[16px]">
              {formatCurrency(totalAReceber)}
            </span>
            <span className="text-[11px] font-medium text-[#11203b]/42">
              <span className="text-[#c89b3c]/65">·</span> Total a receber no
              período
            </span>
          </>
        ) : null}
      </div>

      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={
              isMobile
                ? { top: 12, right: 8, left: 0, bottom: 4 }
                : { top: 18, right: 12, left: 4, bottom: 10 }
            }
            barCategoryGap={isMobile ? "22%" : "28%"}
            barGap={2}
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
              width={isMobile ? 44 : 62}
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
              cursor={{ fill: "rgb(17 32 59 / 3%)", radius: 8 }}
              content={<ChartTooltip />}
              isAnimationActive={false}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: isMobile ? 11 : 12,
                color: TR.navy,
                paddingBottom: 8,
              }}
            />
            <Bar
              name="Recebido"
              dataKey="received"
              fill={TR.received}
              radius={[8, 8, 3, 3]}
              maxBarSize={isMobile ? 14 : 22}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
            />
            <Bar
              name="Pendente"
              dataKey="pending"
              fill={TR.pending}
              radius={[8, 8, 3, 3]}
              maxBarSize={isMobile ? 14 : 22}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
            />
            <Bar
              name="Em atraso"
              dataKey="overdue"
              fill={TR.overdue}
              radius={[8, 8, 3, 3]}
              maxBarSize={isMobile ? 14 : 22}
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
