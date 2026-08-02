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
import type { ExecutiveDashboard } from "@/types/database";
import {
  formatCurrency,
  monthBucketLabel,
  toNumberAmount,
} from "@/lib/dashboard/format";
import { useIsMobile } from "@/hooks/use-is-mobile";

type ExecutiveSalesChartProps = {
  series: ExecutiveDashboard["sales_series"];
  averageTicket?: number | string;
  compact?: boolean;
};

type SalesPoint = {
  bucket: string;
  label: string;
  total: number;
  count: number;
  isCurrent: boolean;
};

const TR = {
  navy: "#11203b",
  rosa: "#c05c7d",
  rosaForte: "#a84568",
  rosaClaro: "#e8c9d1",
  dourado: "#c89b3c",
  cinza: "#b6b6b6",
} as const;

type SalesTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    value?: number | string;
    payload?: SalesPoint;
  }>;
};

function isCurrentMonthBucket(bucket: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return bucket.startsWith(`${year}-${month}`);
}

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

function SalesChartTooltip({ active, payload, label }: SalesTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const total = Number(payload[0]?.value ?? 0);
  const count = Number(point?.count ?? 0);

  return (
    <div
      className="rounded-xl border border-[#11203b]/[0.08] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgb(17_32_59/0.1)]"
      style={{ fontSize: 12 }}
    >
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

export function ExecutiveSalesChart({
  series,
  averageTicket,
  compact = false,
}: ExecutiveSalesChartProps) {
  const isMobile = useIsMobile();
  const gradientUid = useId().replace(/:/g, "");
  const gradientMainId = `sales-bar-main-${gradientUid}`;
  const gradientSoftId = `sales-bar-soft-${gradientUid}`;

  const data = useMemo<SalesPoint[]>(
    () =>
      series.map((point) => ({
        bucket: point.bucket,
        label: monthBucketLabel(point.bucket),
        total: toNumberAmount(point.total),
        count: toNumberAmount(point.count),
        isCurrent: isCurrentMonthBucket(point.bucket),
      })),
    [series]
  );

  const periodTotal = useMemo(
    () => data.reduce((sum, point) => sum + point.total, 0),
    [data]
  );

  const ticketValue =
    averageTicket !== undefined ? toNumberAmount(averageTicket) : null;
  const ticketIsZero = ticketValue === 0;

  const chartHeight = isMobile ? 200 : compact ? 248 : 280;
  const chartMargin = isMobile
    ? { top: 10, right: 2, left: 0, bottom: 4 }
    : { top: 18, right: 8, left: 4, bottom: 10 };
  const yAxisWidth = isMobile ? 40 : compact ? 52 : 58;

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height: chartHeight }}
      >
        Sem vendas confirmadas nos últimos 6 meses.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3 overflow-hidden sm:space-y-5">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 sm:gap-x-2.5">
        <span className="break-words text-left text-[14px] font-extrabold tabular-nums tracking-tight text-[#11203b] sm:text-[16px]">
          {formatCurrency(periodTotal)}
        </span>
        {ticketValue !== null ? (
          <span
            className={
              ticketIsZero
                ? "min-w-0 break-words text-left text-[11px] font-medium tabular-nums text-[#b6b6b6]"
                : "min-w-0 break-words text-left text-[11px] font-medium tabular-nums text-[#11203b]/42"
            }
          >
            <span className={ticketIsZero ? "text-[#b6b6b6]" : "text-[#c89b3c]/65"}>
              ·
            </span>{" "}
            Ticket médio{" "}
            <span
              className={
                ticketIsZero
                  ? "font-medium text-[#b6b6b6]"
                  : "font-semibold text-[#11203b]/50"
              }
            >
              {formatCurrency(ticketValue)}
            </span>
          </span>
        ) : null}
      </div>

      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={chartMargin}
            barCategoryGap={isMobile ? "28%" : "34%"}
          >
            <defs>
              <linearGradient id={gradientMainId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TR.rosaForte} />
                <stop offset="55%" stopColor={TR.rosa} />
                <stop offset="100%" stopColor={TR.rosaClaro} />
              </linearGradient>
              <linearGradient id={gradientSoftId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TR.rosa} />
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
              width={yAxisWidth}
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
              content={<SalesChartTooltip />}
              isAnimationActive={false}
            />
            <Bar
              dataKey="total"
              radius={[10, 10, 4, 4]}
              maxBarSize={isMobile ? 22 : compact ? 28 : 34}
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
                <Cell
                  key={point.bucket}
                  fill={
                    point.isCurrent
                      ? `url(#${gradientMainId})`
                      : `url(#${gradientSoftId})`
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
