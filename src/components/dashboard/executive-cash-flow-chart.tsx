"use client";

import { useMemo } from "react";
import type { ExecutiveDashboard } from "@/types/database";
import {
  dayBucketLabel,
  formatCurrency,
  toNumberAmount,
} from "@/lib/dashboard/format";

type ExecutiveCashFlowChartProps = {
  series: ExecutiveDashboard["cash_flow_series"];
};

export function ExecutiveCashFlowChart({ series }: ExecutiveCashFlowChartProps) {
  const chart = useMemo(() => {
    const width = 720;
    const height = 240;
    const padding = { top: 16, right: 16, bottom: 36, left: 56 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    if (series.length === 0) return null;

    const inflows = series.map((point) => toNumberAmount(point.inflows));
    const outflows = series.map((point) => toNumberAmount(point.outflows));
    const all = [...inflows, ...outflows];
    const maxValue = Math.max(...all, 0);
    const span = maxValue || 1;

    const barGroupWidth = innerWidth / series.length;
    const barWidth = Math.max(2, Math.min(10, barGroupWidth * 0.35));

    const yFor = (value: number) =>
      padding.top + ((maxValue - value) / span) * innerHeight;

    const labelIndexes =
      series.length <= 10
        ? series.map((_, index) => index)
        : [0, Math.floor(series.length / 2), series.length - 1];

    return {
      width,
      height,
      bars: series.map((point, index) => {
        const xCenter = padding.left + index * barGroupWidth + barGroupWidth / 2;
        const inflow = inflows[index];
        const outflow = outflows[index];
        return {
          key: point.bucket,
          inflowX: xCenter - barWidth - 1,
          outflowX: xCenter + 1,
          inflowY: yFor(inflow),
          outflowY: yFor(outflow),
          inflowHeight: Math.max(0, yFor(0) - yFor(inflow)),
          outflowHeight: Math.max(0, yFor(0) - yFor(outflow)),
          barWidth,
        };
      }),
      labels: labelIndexes.map((index) => ({
        index,
        x: padding.left + index * barGroupWidth + barGroupWidth / 2,
        text: dayBucketLabel(series[index].bucket),
      })),
      yTicks: [maxValue, maxValue / 2, 0].map((value) => ({
        value,
        y: yFor(value),
      })),
      totalInflows: inflows.reduce((sum, value) => sum + value, 0),
      totalOutflows: outflows.reduce((sum, value) => sum + value, 0),
      zeroY: yFor(0),
    };
  }, [series]);

  if (!chart) {
    return (
      <div className="flex h-60 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Sem movimentos realizados no mês para o gráfico.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
          Entradas ({formatCurrency(chart.totalInflows)})
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-600" />
          Saídas ({formatCurrency(chart.totalOutflows)})
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-60 w-full min-w-[520px]"
          role="img"
          aria-label="Entradas e saídas realizadas no mês"
        >
          <line
            x1={56}
            y1={chart.zeroY}
            x2={704}
            y2={chart.zeroY}
            className="stroke-border"
            strokeWidth={1}
          />

          {chart.yTicks.map((tick) => (
            <g key={`y-${tick.value}`}>
              <line
                x1={56}
                y1={tick.y}
                x2={704}
                y2={tick.y}
                className="stroke-muted"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text
                x={50}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {formatCurrency(tick.value)}
              </text>
            </g>
          ))}

          {chart.bars.map((bar) => (
            <g key={bar.key}>
              <rect
                x={bar.inflowX}
                y={bar.inflowY}
                width={bar.barWidth}
                height={bar.inflowHeight}
                className="fill-emerald-600"
                rx={1}
              />
              <rect
                x={bar.outflowX}
                y={bar.outflowY}
                width={bar.barWidth}
                height={bar.outflowHeight}
                className="fill-rose-600"
                rx={1}
              />
            </g>
          ))}

          {chart.labels.map((label) => (
            <text
              key={`x-${label.index}`}
              x={label.x}
              y={chart.height - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {label.text}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
