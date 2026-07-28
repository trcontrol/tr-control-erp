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
import type { ExecutiveDashboard } from "@/types/database";
import {
  formatCurrency,
  monthBucketLabel,
  toNumberAmount,
} from "@/lib/dashboard/format";

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

function isCurrentMonthBucket(bucket: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return bucket.startsWith(`${year}-${month}`);
}

export function ExecutiveSalesChart({
  series,
  averageTicket,
  compact = false,
}: ExecutiveSalesChartProps) {
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

  const chartHeight = compact ? 248 : 280;

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
    <div className="w-full min-w-0 space-y-4 overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
        <span className="font-semibold text-[var(--brand-navy)]">
          {formatCurrency(periodTotal)}
        </span>
        {averageTicket !== undefined ? (
          <span>· Ticket {formatCurrency(toNumberAmount(averageTicket))}</span>
        ) : null}
      </div>

      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, left: 2, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid
              strokeDasharray="3 10"
              vertical={false}
              stroke="rgb(11 31 58 / 5%)"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickMargin={10}
            />
            <YAxis
              width={compact ? 48 : 56}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={(value: number) => formatCompactCurrency(value)}
            />
            <Tooltip
              cursor={{ fill: "rgb(11 31 58 / 2.5%)" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgb(11 31 58 / 7%)",
                boxShadow: "var(--shadow-card)",
                fontSize: 12,
              }}
              formatter={(value, _name, item) => {
                const count = Number(
                  (item?.payload as SalesPoint | undefined)?.count ?? 0
                );
                return [
                  `${formatCurrency(Number(value ?? 0))} (${count} venda${count === 1 ? "" : "s"})`,
                  "Total",
                ];
              }}
              labelFormatter={(label) => String(label)}
            />
            <Bar
              dataKey="total"
              radius={[8, 8, 2, 2]}
              maxBarSize={compact ? 34 : 42}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
            >
              {data.map((point) => (
                <Cell
                  key={point.bucket}
                  fill={
                    point.isCurrent
                      ? "var(--brand-coral)"
                      : "var(--brand-navy)"
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
