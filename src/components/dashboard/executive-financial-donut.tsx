"use client";

import { useMemo } from "react";
import type { ExecutiveDashboard } from "@/types/database";
import { formatCurrency, toNumberAmount } from "@/lib/dashboard/format";

type ExecutiveFinancialDonutProps = {
  kpis: ExecutiveDashboard["kpis"];
};

type Segment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

function participationPercent(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${((value / total) * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
}

export function ExecutiveFinancialDonut({
  kpis,
}: ExecutiveFinancialDonutProps) {
  const chart = useMemo(() => {
    const segments: Segment[] = [
      {
        key: "received",
        label: "Recebido",
        value: toNumberAmount(kpis.month_inflows),
        color: "#0f766e",
      },
      {
        key: "receivable",
        label: "A receber",
        value: toNumberAmount(kpis.open_receivables),
        color: "#38bdf8",
      },
      {
        key: "paid",
        label: "Pago",
        value: toNumberAmount(kpis.month_outflows),
        color: "var(--brand-coral)",
      },
      {
        key: "payable",
        label: "A pagar",
        value: toNumberAmount(kpis.open_payables),
        color: "#c9a227",
      },
      {
        key: "overdue",
        label: "Em atraso",
        value: toNumberAmount(kpis.overdue_total),
        color: "#b91c1c",
      },
    ];

    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    if (total <= 0) return null;

    const size = 168;
    const stroke = 24;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    let offset = circumference * 0.25;
    const arcs = segments
      .filter((segment) => segment.value > 0)
      .map((segment) => {
        const length = (segment.value / total) * circumference;
        const arc = {
          ...segment,
          dasharray: `${length} ${circumference - length}`,
          dashoffset: offset,
        };
        offset -= length;
        return arc;
      });

    return {
      size,
      stroke,
      radius,
      circumference,
      segments,
      arcs,
      total,
      result: toNumberAmount(kpis.month_result),
      received: toNumberAmount(kpis.month_inflows),
      openReceivables: toNumberAmount(kpis.open_receivables),
      overdue: toNumberAmount(kpis.overdue_total),
    };
  }, [kpis]);

  if (!chart) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Sem composição financeira para exibir no mês.
      </div>
    );
  }

  const center = chart.size / 2;

  return (
    <div className="flex h-full min-h-[280px] flex-col gap-4">
      <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative shrink-0">
          <svg
            width={chart.size}
            height={chart.size}
            viewBox={`0 0 ${chart.size} ${chart.size}`}
            role="img"
            aria-label="Composição financeira do mês"
          >
            <circle
              cx={center}
              cy={center}
              r={chart.radius}
              fill="none"
              stroke="currentColor"
              className="text-muted/30"
              strokeWidth={chart.stroke}
            />
            {chart.arcs.map((arc) => (
              <circle
                key={arc.key}
                cx={center}
                cy={center}
                r={chart.radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={chart.stroke}
                strokeDasharray={arc.dasharray}
                strokeDashoffset={arc.dashoffset}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
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

        <div className="w-full space-y-2 text-sm sm:max-w-[220px]">
          {chart.segments.map((segment) => (
            <div
              key={segment.key}
              className="flex items-center justify-between gap-3"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="truncate">{segment.label}</span>
              </span>
              <span className="shrink-0 text-right text-xs">
                <span className="block font-medium text-[var(--brand-navy)]">
                  {formatCurrency(segment.value)}
                </span>
                <span className="text-muted-foreground">
                  {participationPercent(segment.value, chart.total)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-[var(--brand-navy)] px-3 py-2.5 text-white">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/65">
            Recebido
          </p>
          <p className="mt-0.5 text-xs font-semibold sm:text-sm">
            {formatCurrency(chart.received)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/65">
            A receber
          </p>
          <p className="mt-0.5 text-xs font-semibold sm:text-sm">
            {formatCurrency(chart.openReceivables)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-white/65">
            Em atraso
          </p>
          <p className="mt-0.5 text-xs font-semibold text-[var(--brand-gold-soft)] sm:text-sm">
            {formatCurrency(chart.overdue)}
          </p>
        </div>
      </div>
    </div>
  );
}
