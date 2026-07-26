"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExecutiveDashboard } from "@/types/database";
import {
  dayBucketLabel,
  formatCurrency,
  toNumberAmount,
} from "@/lib/dashboard/format";

type ExecutiveCashFlowChartProps = {
  series: ExecutiveDashboard["cash_flow_series"];
};

type CashFlowPoint = {
  bucket: string;
  label: string;
  inflows: number;
  outflows: number;
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

export function ExecutiveCashFlowChart({ series }: ExecutiveCashFlowChartProps) {
  const data = useMemo<CashFlowPoint[]>(
    () =>
      series.map((point) => ({
        bucket: point.bucket,
        label: dayBucketLabel(point.bucket),
        inflows: toNumberAmount(point.inflows),
        outflows: toNumberAmount(point.outflows),
      })),
    [series]
  );

  const totals = useMemo(() => {
    return data.reduce(
      (acc, point) => ({
        inflows: acc.inflows + point.inflows,
        outflows: acc.outflows + point.outflows,
      }),
      { inflows: 0, outflows: 0 }
    );
  }, [data]);

  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Sem movimentos realizados no mês para o gráfico.
      </div>
    );
  }

  const tickInterval =
    data.length <= 8 ? 0 : data.length <= 16 ? 1 : Math.ceil(data.length / 8);

  return (
    <div className="w-full min-w-0 space-y-3 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
          Entradas ({formatCurrency(totals.inflows)})
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand-coral)]" />
          Saídas ({formatCurrency(totals.outflows)})
        </span>
      </div>

      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="18%"
            barGap={2}
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
              interval={tickInterval}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              minTickGap={16}
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
              formatter={(value, name) => [
                formatCurrency(Number(value ?? 0)),
                name === "inflows" ? "Entradas" : "Saídas",
              ]}
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Bar
              dataKey="inflows"
              name="inflows"
              fill="#059669"
              radius={[2, 2, 0, 0]}
              maxBarSize={18}
            />
            <Bar
              dataKey="outflows"
              name="outflows"
              fill="var(--brand-coral)"
              radius={[2, 2, 0, 0]}
              maxBarSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
