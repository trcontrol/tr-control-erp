"use client";

import { useMemo } from "react";
import type { ExecutiveDashboard } from "@/types/database";
import { formatCurrency, toNumberAmount } from "@/lib/dashboard/format";

type ExecutiveFinancialDonutProps = {
  kpis: ExecutiveDashboard["kpis"];
};

export function ExecutiveFinancialDonut({
  kpis,
}: ExecutiveFinancialDonutProps) {
  const chart = useMemo(() => {
    const inflows = toNumberAmount(kpis.month_inflows);
    const outflows = toNumberAmount(kpis.month_outflows);
    const total = inflows + outflows;

    if (total <= 0) {
      return null;
    }

    const size = 180;
    const stroke = 22;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const inflowLength = (inflows / total) * circumference;
    const outflowLength = (outflows / total) * circumference;

    return {
      size,
      stroke,
      radius,
      circumference,
      inflows,
      outflows,
      total,
      inflowLength,
      outflowLength,
      result: toNumberAmount(kpis.month_result),
    };
  }, [kpis.month_inflows, kpis.month_outflows, kpis.month_result]);

  if (!chart) {
    return (
      <div className="flex h-60 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Sem entradas ou saídas realizadas no mês para o gráfico.
      </div>
    );
  }

  const center = chart.size / 2;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative">
        <svg
          width={chart.size}
          height={chart.size}
          viewBox={`0 0 ${chart.size} ${chart.size}`}
          role="img"
          aria-label="Distribuição de entradas e saídas do mês"
        >
          <circle
            cx={center}
            cy={center}
            r={chart.radius}
            fill="none"
            stroke="currentColor"
            className="text-muted/40"
            strokeWidth={chart.stroke}
          />
          <circle
            cx={center}
            cy={center}
            r={chart.radius}
            fill="none"
            stroke="#0f766e"
            strokeWidth={chart.stroke}
            strokeDasharray={`${chart.inflowLength} ${chart.circumference - chart.inflowLength}`}
            strokeDashoffset={chart.circumference * 0.25}
            strokeLinecap="butt"
          />
          <circle
            cx={center}
            cy={center}
            r={chart.radius}
            fill="none"
            stroke="var(--brand-coral)"
            strokeWidth={chart.stroke}
            strokeDasharray={`${chart.outflowLength} ${chart.circumference - chart.outflowLength}`}
            strokeDashoffset={
              chart.circumference * 0.25 - chart.inflowLength
            }
            strokeLinecap="butt"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted-foreground">Resultado</span>
          <span
            className={
              chart.result >= 0
                ? "text-sm font-semibold text-emerald-700"
                : "text-sm font-semibold text-[var(--brand-coral)]"
            }
          >
            {formatCurrency(chart.result)}
          </span>
        </div>
      </div>

      <div className="w-full space-y-3 text-sm sm:max-w-[220px]">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-700" />
            Entradas
          </span>
          <span className="font-medium">{formatCurrency(chart.inflows)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand-coral)]" />
            Saídas
          </span>
          <span className="font-medium">{formatCurrency(chart.outflows)}</span>
        </div>
        <div className="border-t pt-2 text-xs text-muted-foreground">
          Total movimentado: {formatCurrency(chart.total)}
        </div>
      </div>
    </div>
  );
}
