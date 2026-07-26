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

  if (!data.length) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Sem vendas confirmadas nos últimos 6 meses.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3 overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Total no período: {formatCurrency(periodTotal)}</span>
        {averageTicket !== undefined ? (
          <span>
            Ticket médio do mês:{" "}
            {formatCurrency(toNumberAmount(averageTicket))}
          </span>
        ) : null}
      </div>

      <div className="h-[260px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="22%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickFormatter={(value: number) => formatCompactCurrency(value)}
            />
            <Tooltip
              cursor={{ fill: "rgb(11 31 58 / 4%)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid rgb(11 31 58 / 12%)",
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
            <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={42}>
              {data.map((point) => (
                <Cell
                  key={point.bucket}
                  fill={point.isCurrent ? "var(--brand-coral)" : "#0f4c81"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
