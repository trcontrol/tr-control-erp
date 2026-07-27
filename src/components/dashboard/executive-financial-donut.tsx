"use client";

import { useMemo } from "react";
import { AlertTriangle, CircleDollarSign, WalletCards } from "lucide-react";
import type { ExecutiveDashboard } from "@/types/database";
import { formatCurrency, toNumberAmount } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

type ExecutiveFinancialDonutProps = {
  kpis: ExecutiveDashboard["kpis"];
  compact?: boolean;
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
  compact = false,
}: ExecutiveFinancialDonutProps) {
  const chart = useMemo(() => {
    const segments: Segment[] = [
      {
        key: "received",
        label: "Recebido",
        value: toNumberAmount(kpis.month_inflows),
        color: "var(--brand-teal)",
      },
      {
        key: "receivable",
        label: "A receber",
        value: toNumberAmount(kpis.open_receivables),
        color: "var(--brand-sky)",
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
        color: "var(--brand-gold)",
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

    const size = compact ? 152 : 172;
    const stroke = compact ? 14 : 16;
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
      segments,
      arcs,
      total,
      received: toNumberAmount(kpis.month_inflows),
      openReceivables: toNumberAmount(kpis.open_receivables),
      overdue: toNumberAmount(kpis.overdue_total),
    };
  }, [compact, kpis]);

  if (!chart) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Sem composição financeira para exibir no mês.
      </div>
    );
  }

  const center = chart.size / 2;

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        compact ? "min-h-[280px] gap-4" : "min-h-[300px] gap-5"
      )}
    >
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
              className="text-[var(--brand-navy)]/8"
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
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Total
            </span>
            <span
              className={cn(
                "mt-1 font-bold tabular-nums text-[var(--brand-navy)]",
                compact ? "text-sm" : "text-base"
              )}
            >
              {formatCurrency(chart.total)}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "w-full space-y-2.5 text-sm",
            compact ? "sm:max-w-[200px]" : "sm:max-w-[230px]"
          )}
        >
          {chart.segments.map((segment) => (
            <div
              key={segment.key}
              className="flex items-center justify-between gap-2"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="truncate text-[12px] text-[var(--brand-navy)]/80">
                  {segment.label}
                </span>
              </span>
              <span className="shrink-0 text-right text-[11px]">
                <span className="block font-semibold tabular-nums text-[var(--brand-navy)]">
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

      <div className="grid grid-cols-3 gap-2 border-t border-[var(--brand-navy)]/[0.05] pt-3">
        <div className="px-1 py-0.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <CircleDollarSign className="h-3 w-3 text-emerald-600" />
            Recebido
          </div>
          <p className="mt-1 truncate text-xs font-bold tabular-nums text-emerald-700">
            {formatCurrency(chart.received)}
          </p>
        </div>
        <div className="px-1 py-0.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <WalletCards className="h-3 w-3 text-[var(--brand-gold)]" />
            A receber
          </div>
          <p className="mt-1 truncate text-xs font-bold tabular-nums text-[var(--brand-navy)]">
            {formatCurrency(chart.openReceivables)}
          </p>
        </div>
        <div className="px-1 py-0.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <AlertTriangle className="h-3 w-3 text-[var(--brand-coral)]" />
            Atraso
          </div>
          <p className="mt-1 truncate text-xs font-bold tabular-nums text-[var(--brand-coral)]">
            {formatCurrency(chart.overdue)}
          </p>
        </div>
      </div>
    </div>
  );
}
