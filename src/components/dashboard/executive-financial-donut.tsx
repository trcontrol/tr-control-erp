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
        "@container/finance flex h-full min-w-0 flex-col gap-4 sm:gap-5"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col items-stretch gap-4 sm:items-center sm:gap-5 @[26rem]:flex-row @[26rem]:items-center @[26rem]:gap-6">
        <div className="relative mx-auto shrink-0">
          <svg
            width={chart.size}
            height={chart.size}
            className="max-h-[168px] w-auto max-w-[168px] sm:max-h-none sm:max-w-none"
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
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[11px] font-medium text-muted-foreground">
              Total
            </span>
            <span className="mt-1 max-w-full break-words text-[12px] font-bold leading-snug tabular-nums text-[var(--brand-navy)] sm:text-[13px]">
              {formatCurrency(chart.total)}
            </span>
          </div>
        </div>

        <ul className="w-full min-w-0 flex-1 space-y-2 sm:space-y-2.5 @[26rem]:min-w-[11.5rem]">
          {chart.segments.map((segment) => (
            <li
              key={segment.key}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,max-content)] items-start gap-x-2 px-0.5 sm:gap-x-2.5"
            >
              <span className="inline-flex min-w-0 items-center gap-2 pr-1 sm:gap-2.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="truncate text-left text-[12px] font-medium text-[var(--brand-navy)]/80 sm:text-[12.5px]">
                  {segment.label}
                </span>
              </span>
              <span className="min-w-0 max-w-full text-right">
                <span className="block break-words text-[12px] font-semibold tabular-nums text-[var(--brand-navy)] sm:text-[12.5px]">
                  {formatCurrency(segment.value)}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {participationPercent(segment.value, chart.total)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[var(--brand-navy)]/[0.05] pt-3.5 sm:gap-2.5 sm:pt-4 @[28rem]:grid-cols-4">
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-[var(--brand-navy)]/[0.05] px-2.5 py-2.5 sm:px-3 sm:py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <CircleDollarSign className="h-3 w-3 shrink-0 text-[var(--brand-navy)] sm:h-3.5 sm:w-3.5" />
            <span className="truncate text-left">Recebido</span>
          </div>
          <p className="mt-1.5 break-words text-left text-[12px] font-bold leading-snug tabular-nums text-[var(--brand-navy)] sm:mt-2 sm:text-[12.5px]">
            {formatCurrency(chart.received)}
          </p>
        </div>
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-[#b8788a]/[0.1] px-2.5 py-2.5 sm:px-3 sm:py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <WalletCards className="h-3 w-3 shrink-0 text-[#b8788a] sm:h-3.5 sm:w-3.5" />
            <span className="truncate text-left">A receber</span>
          </div>
          <p className="mt-1.5 break-words text-left text-[12px] font-bold leading-snug tabular-nums text-[var(--brand-navy)] sm:mt-2 sm:text-[12.5px]">
            {formatCurrency(chart.openReceivables)}
          </p>
        </div>
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-[#9aa3b2]/[0.12] px-2.5 py-2.5 sm:px-3 sm:py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <AlertTriangle className="h-3 w-3 shrink-0 text-[#8b93a3] sm:h-3.5 sm:w-3.5" />
            <span className="truncate text-left">Em atraso</span>
          </div>
          <p className="mt-1.5 break-words text-left text-[12px] font-bold leading-snug tabular-nums text-[var(--brand-navy)]/75 sm:mt-2 sm:text-[12.5px]">
            {formatCurrency(chart.overdue)}
          </p>
        </div>
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-[var(--brand-gold)]/[0.1] px-2.5 py-2.5 sm:px-3 sm:py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Scale className="h-3 w-3 shrink-0 text-[var(--brand-gold)] sm:h-3.5 sm:w-3.5" />
            <span className="truncate text-left">Resultado</span>
          </div>
          <p
            className={cn(
              "mt-1.5 break-words text-left text-[12px] font-bold leading-snug tabular-nums sm:mt-2 sm:text-[12.5px]",
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
