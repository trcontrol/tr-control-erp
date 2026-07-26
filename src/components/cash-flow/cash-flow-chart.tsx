"use client";

import { useMemo } from "react";
import type { CashFlowDashboard } from "@/types/database";
import { formatCurrency, formatDateBR, toNumberAmount } from "@/lib/cash-flow/format";

type SeriesPoint = CashFlowDashboard["series"][number];

type CashFlowChartProps = {
  series: SeriesPoint[];
  grain: "day" | "week" | "month";
};

function formatBucketLabel(bucket: string, grain: string) {
  if (grain === "month") {
    return new Date(`${bucket}T00:00:00`).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });
  }
  return formatDateBR(bucket);
}

export function CashFlowChart({ series, grain }: CashFlowChartProps) {
  const chart = useMemo(() => {
    const width = 720;
    const height = 260;
    const padding = { top: 20, right: 16, bottom: 36, left: 56 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    if (series.length === 0) {
      return null;
    }

    const realized = series.map((point) => toNumberAmount(point.realized_balance));
    const projected = series.map((point) =>
      toNumberAmount(point.projected_balance)
    );
    const all = [...realized, ...projected];
    const minValue = Math.min(...all, 0);
    const maxValue = Math.max(...all, 0);
    const span = maxValue - minValue || 1;

    const xFor = (index: number) => {
      if (series.length === 1) return padding.left + innerWidth / 2;
      return padding.left + (index / (series.length - 1)) * innerWidth;
    };

    const yFor = (value: number) =>
      padding.top + ((maxValue - value) / span) * innerHeight;

    const toPath = (values: number[]) =>
      values
        .map((value, index) => {
          const command = index === 0 ? "M" : "L";
          return `${command}${xFor(index)},${yFor(value)}`;
        })
        .join(" ");

    const zeroY = yFor(0);
    const labelIndexes =
      series.length <= 8
        ? series.map((_, index) => index)
        : [0, Math.floor(series.length / 2), series.length - 1];

    return {
      width,
      height,
      zeroY,
      realizedPath: toPath(realized),
      projectedPath: toPath(projected),
      labels: labelIndexes.map((index) => ({
        index,
        x: xFor(index),
        text: formatBucketLabel(series[index].bucket, grain),
      })),
      yTicks: [maxValue, (maxValue + minValue) / 2, minValue].map((value) => ({
        value,
        y: yFor(value),
      })),
      lastRealized: realized[realized.length - 1] ?? 0,
      lastProjected: projected[projected.length - 1] ?? 0,
    };
  }, [grain, series]);

  if (!chart) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Sem dados no período para o gráfico.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 bg-emerald-600" />
          Realizado ({formatCurrency(chart.lastRealized)})
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-600" />
          Projetado ({formatCurrency(chart.lastProjected)})
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-64 w-full min-w-[520px]"
          role="img"
          aria-label="Evolução do fluxo de caixa realizado e projetado"
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

          <path
            d={chart.realizedPath}
            fill="none"
            className="stroke-emerald-600"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={chart.projectedPath}
            fill="none"
            className="stroke-amber-600"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

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
