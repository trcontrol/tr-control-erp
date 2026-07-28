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
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Sem movimentos realizados no mês para o gráfico.
      </div>
    );
  }

  const tickInterval =
    data.length <= 8 ? 0 : data.length <= 16 ? 1 : Math.ceil(data.length / 8);

  return (
    <div className="w-full min-w-0 space-y-4 overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
        <span className="inline-flex items-center gap-2 font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          Entradas {formatCurrency(totals.inflows)}
        </span>
        <span className="inline-flex items-center gap-2 font-medium text-[var(--brand-coral)]">
          <span className="h-2 w-2 rounded-full bg-[var(--brand-coral)]" />
          Saídas {formatCurrency(totals.outflows)}
        </span>
      </div>

      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 10, left: 2, bottom: 4 }}
            barCategoryGap="22%"
            barGap={3}
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
              interval={tickInterval}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              minTickGap={14}
              tickMargin={10}
            />
            <YAxis
              width={58}
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
              radius={[6, 6, 2, 2]}
              maxBarSize={18}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="outflows"
              name="outflows"
              fill="var(--brand-coral)"
              radius={[6, 6, 2, 2]}
              maxBarSize={18}
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
