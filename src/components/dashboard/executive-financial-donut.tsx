"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  Scale,
  WalletCards,
} from "lucide-react";
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

/** Paleta exclusiva do Resumo financeiro — identidade TR Control. */
const FINANCE_SEGMENT_COLORS = {
  received: "var(--brand-navy)",
  receivable: "#c05c7d",
  paid: "#e8c9d1",
  payable: "#c89b3c",
  overdue: "#b6b6b6",
} as const;

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
        color: FINANCE_SEGMENT_COLORS.received,
      },
      {
        key: "receivable",
        label: "A receber",
        value: toNumberAmount(kpis.open_receivables),
        color: FINANCE_SEGMENT_COLORS.receivable,
      },
      {
        key: "paid",
        label: "Pago",
        value: toNumberAmount(kpis.month_outflows),
        color: FINANCE_SEGMENT_COLORS.paid,
      },
      {
        key: "payable",
        label: "A pagar",
        value: toNumberAmount(kpis.open_payables),
        color: FINANCE_SEGMENT_COLORS.payable,
      },
      {
        key: "overdue",
        label: "Em atraso",
        value: toNumberAmount(kpis.overdue_total),
        color: FINANCE_SEGMENT_COLORS.overdue,
      },
    ];

    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    if (total <= 0) return null;

    const size = compact ? 168 : 196;
    const stroke = compact ? 18 : 22;
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
      result: toNumberAmount(kpis.month_result),
    };
  }, [compact, kpis]);

  if (!chart) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Sem composição financeira para exibir no mês.
      </div>
    );
  }

  const center = chart.size / 2;
  const resultPositive = chart.result >= 0;

  return (
    <div
      className={cn(
        "@container/finance flex h-full min-w-0 flex-col",
        compact ? "gap-5" : "gap-5"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col items-center gap-5 @[26rem]:flex-row @[26rem]:items-center @[26rem]:gap-6">
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
              className="text-[var(--brand-navy)]/[0.06]"
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
                className="transition-[stroke-dasharray] duration-700 ease-out"
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
            <span className="text-[11px] font-medium text-muted-foreground">
              Total
            </span>
            <span className="mt-1 whitespace-nowrap text-[13px] font-bold leading-snug tabular-nums text-[var(--brand-navy)] sm:text-sm">
              {formatCurrency(chart.total)}
            </span>
          </div>
        </div>

        <ul className="w-full min-w-0 flex-1 space-y-2.5 @[26rem]:min-w-[11.5rem]">
          {chart.segments.map((segment) => (
            <li
              key={segment.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 px-0.5"
            >
              <span className="inline-flex min-w-0 items-center gap-2.5 pr-1">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="truncate text-[12.5px] font-medium text-[var(--brand-navy)]/80">
                  {segment.label}
                </span>
              </span>
              <span className="min-w-0 text-right">
                <span className="block whitespace-nowrap text-[12.5px] font-semibold tabular-nums text-[var(--brand-navy)]">
                  {formatCurrency(segment.value)}
                </span>
                <span className="block whitespace-nowrap text-[11px] text-muted-foreground">
                  {participationPercent(segment.value, chart.total)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2.5 border-t border-[var(--brand-navy)]/[0.05] pt-4 @[28rem]:grid-cols-4">
        <div className="flex min-w-0 flex-col rounded-xl bg-[var(--brand-navy)]/[0.05] px-3 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <CircleDollarSign className="h-3.5 w-3.5 shrink-0 text-[var(--brand-navy)]" />
            <span className="truncate">Recebido</span>
          </div>
          <p className="mt-2 whitespace-nowrap text-[12.5px] font-bold leading-snug tabular-nums text-[var(--brand-navy)]">
            {formatCurrency(chart.received)}
          </p>
        </div>
        <div className="flex min-w-0 flex-col rounded-xl bg-[#b8788a]/[0.1] px-3 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <WalletCards className="h-3.5 w-3.5 shrink-0 text-[#b8788a]" />
            <span className="truncate">A receber</span>
          </div>
          <p className="mt-2 whitespace-nowrap text-[12.5px] font-bold leading-snug tabular-nums text-[var(--brand-navy)]">
            {formatCurrency(chart.openReceivables)}
          </p>
        </div>
        <div className="flex min-w-0 flex-col rounded-xl bg-[#9aa3b2]/[0.12] px-3 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#8b93a3]" />
            <span className="truncate">Em atraso</span>
          </div>
          <p className="mt-2 whitespace-nowrap text-[12.5px] font-bold leading-snug tabular-nums text-[var(--brand-navy)]/75">
            {formatCurrency(chart.overdue)}
          </p>
        </div>
        <div className="flex min-w-0 flex-col rounded-xl bg-[var(--brand-gold)]/[0.1] px-3 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Scale className="h-3.5 w-3.5 shrink-0 text-[var(--brand-gold)]" />
            <span className="truncate">Resultado</span>
          </div>
          <p
            className={cn(
              "mt-2 whitespace-nowrap text-[12.5px] font-bold leading-snug tabular-nums",
              resultPositive
                ? "text-[var(--brand-navy)]"
                : "text-[var(--brand-coral)]"
            )}
          >
            {formatCurrency(chart.result)}
          </p>
        </div>
      </div>
    </div>
  );
}
