"use client";

import { useMemo } from "react";
import type { ExecutiveDashboard } from "@/types/database";
import {
  formatCurrency,
  monthBucketLabel,
  toNumberAmount,
} from "@/lib/dashboard/format";

type ExecutiveSalesChartProps = {
  series: ExecutiveDashboard["sales_series"];
};

export function ExecutiveSalesChart({ series }: ExecutiveSalesChartProps) {
  const chart = useMemo(() => {
    const width = 720;
    const height = 240;
    const padding = { top: 16, right: 16, bottom: 36, left: 56 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    if (series.length === 0) return null;

    const totals = series.map((point) => toNumberAmount(point.total));
    const maxValue = Math.max(...totals, 0);
    const span = maxValue || 1;
    const barGroupWidth = innerWidth / series.length;
    const barWidth = Math.max(12, Math.min(36, barGroupWidth * 0.55));

    const yFor = (value: number) =>
      padding.top + ((maxValue - value) / span) * innerHeight;

    return {
      width,
      height,
      bars: series.map((point, index) => {
        const total = totals[index];
        const x =
          padding.left + index * barGroupWidth + (barGroupWidth - barWidth) / 2;
        const y = yFor(total);
        return {
          key: point.bucket,
          x,
          y,
          height: Math.max(0, yFor(0) - y),
          width: barWidth,
          label: monthBucketLabel(point.bucket),
          labelX: padding.left + index * barGroupWidth + barGroupWidth / 2,
          total,
          count: toNumberAmount(point.count),
        };
      }),
      yTicks: [maxValue, maxValue / 2, 0].map((value) => ({
        value,
        y: yFor(value),
      })),
      zeroY: yFor(0),
      periodTotal: totals.reduce((sum, value) => sum + value, 0),
    };
  }, [series]);

  if (!chart) {
    return (
      <div className="flex h-60 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Sem vendas confirmadas nos últimos 6 meses.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Total no período: {formatCurrency(chart.periodTotal)}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-60 w-full min-w-[420px]"
          role="img"
          aria-label="Evolução mensal das vendas nos últimos 6 meses"
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
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                className="fill-sky-700"
                rx={2}
              >
                <title>
                  {bar.label}: {formatCurrency(bar.total)} ({bar.count} venda
                  {bar.count === 1 ? "" : "s"})
                </title>
              </rect>
              <text
                x={bar.labelX}
                y={chart.height - 10}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {bar.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
