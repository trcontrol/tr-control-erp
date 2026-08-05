"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Funnel, Target } from "lucide-react";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { DashboardSectionLink } from "@/components/dashboard/dashboard-section-link";
import { OPPORTUNITY_STAGES, ROUTES } from "@/lib/constants";
import {
  getFunnelDashboardSummary,
  type FunnelDashboardSummary,
  type FunnelStageSummaryRow,
} from "@/lib/dashboard/funnel-summary";
import { formatCurrency } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

type ExecutiveFunnelSummaryProps = {
  companyId: string;
};

type StageTone = {
  fill: string;
  text: string;
  dot: string;
};

/** Escala visual: a barra de 100% ocupa ~82% da coluna (não a largura total). */
const BAR_SCALE = 0.82;

/**
 * Paleta das 8 etapas do funil no Dashboard (Perdido não entra).
 * Bolinha e barra usam a mesma cor; barra vazia usa tom mais claro da etapa.
 */
function stageTone(stage: string, empty: boolean): StageTone {
  switch (stage) {
    case OPPORTUNITY_STAGES.new_lead:
      return empty
        ? {
            fill: "bg-[#c5ccd8]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[#0a1628]",
          }
        : {
            fill: "bg-[#0a1628] shadow-[0_1px_5px_rgb(10_22_40/0.18)]",
            text: "text-white",
            dot: "bg-[#0a1628]",
          };
    case OPPORTUNITY_STAGES.contact_made:
      return empty
        ? {
            fill: "bg-[#b7c9de]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[#1e4a7a]",
          }
        : {
            fill: "bg-[#1e4a7a] shadow-[0_1px_3px_rgb(30_74_122/0.12)]",
            text: "text-white",
            dot: "bg-[#1e4a7a]",
          };
    case OPPORTUNITY_STAGES.briefing_sent:
      return empty
        ? {
            fill: "bg-[#f0c2d2]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[#d9487a]",
          }
        : {
            fill: "bg-[#d9487a] shadow-[0_1px_3px_rgb(217_72_122/0.14)]",
            text: "text-white",
            dot: "bg-[#d9487a]",
          };
    case OPPORTUNITY_STAGES.proposal_sent:
      return empty
        ? {
            fill: "bg-[#f8dde5]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[#f0b8c8]",
          }
        : {
            fill: "bg-[#f0b8c8] shadow-[0_1px_3px_rgb(240_184_200/0.2)]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[#f0b8c8]",
          };
    case OPPORTUNITY_STAGES.negotiation:
      return empty
        ? {
            fill: "bg-[#ebe0b0]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[var(--brand-gold)]",
          }
        : {
            fill: "bg-[var(--brand-gold)] shadow-[0_1px_3px_rgb(201_162_39/0.14)]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[var(--brand-gold)]",
          };
    case OPPORTUNITY_STAGES.contract_closed:
      return empty
        ? {
            fill: "bg-[#e8dfb8]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[#d4bc6a]",
          }
        : {
            fill: "bg-[#d4bc6a] shadow-[0_1px_3px_rgb(212_188_106/0.16)]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[#d4bc6a]",
          };
    case OPPORTUNITY_STAGES.project_in_progress:
      return empty
        ? {
            fill: "bg-[#ddd6cc]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[#c4b8a8]",
          }
        : {
            fill: "bg-[#c4b8a8] shadow-[0_1px_2px_rgb(196_184_168/0.18)]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[#c4b8a8]",
          };
    case OPPORTUNITY_STAGES.completed:
      return empty
        ? {
            fill: "bg-[#d1d5db]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[#9ca3af]",
          }
        : {
            fill: "bg-[#9ca3af] shadow-[0_1px_2px_rgb(156_163_175/0.14)]",
            text: "text-white",
            dot: "bg-[#9ca3af]",
          };
    default:
      return empty
        ? {
            fill: "bg-[#d9dce3]",
            text: "text-[var(--brand-navy)]",
            dot: "bg-[#b0b4bc]",
          }
        : {
            fill: "bg-[#b0b4bc]",
            text: "text-white",
            dot: "bg-[#b0b4bc]",
          };
  }
}

function formatConversionRate(value: number) {
  if (!Number.isFinite(value)) return "0%";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? `${rounded}%`
    : `${rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** Percentual visual: etapa ÷ 1ª etapa × 100 (só apresentação). */
function stageDisplayPercent(count: number, baseCount: number) {
  if (baseCount <= 0 || count <= 0) return 0;
  return Math.min(100, Math.round((count / baseCount) * 100));
}

function FunnelStageRow({
  row,
  index,
  baseCount,
}: {
  row: FunnelStageSummaryRow;
  index: number;
  baseCount: number;
}) {
  const isFirst = index === 1;
  const empty = row.count <= 0;
  const percent = stageDisplayPercent(row.count, baseCount);
  const tone = stageTone(row.stage, empty);
  const visualPercent = empty ? 26 : Math.max(percent, 16);
  const width = visualPercent * BAR_SCALE;
  const valueHint =
    row.totalValue > 0 ? formatCurrency(row.totalValue) : undefined;

  return (
    <div
      className="grid h-6 min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(5.5rem,42%)] items-center gap-x-1.5 sm:h-[26px] sm:grid-cols-[minmax(0,1fr)_auto_minmax(6rem,44%)] sm:gap-x-2"
      title={valueHint}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn("h-2.5 w-2.5 shrink-0 rounded-full", tone.dot)}
          aria-hidden
        />
        <p
          className={cn(
            "min-w-0 truncate text-[11.5px] leading-none sm:text-[12px]",
            isFirst
              ? "font-semibold text-[var(--brand-navy)]"
              : "font-medium text-[var(--brand-navy)]/72"
          )}
        >
          <span className="tabular-nums text-[var(--brand-navy)]/40">
            {index}.
          </span>{" "}
          {row.label}
        </p>
      </div>

      <span
        className={cn(
          "w-5 shrink-0 text-right text-[11.5px] tabular-nums leading-none sm:w-6 sm:text-[12px]",
          isFirst
            ? "font-bold text-[var(--brand-navy)]"
            : "font-semibold text-[var(--brand-navy)]/70"
        )}
      >
        {row.count}
      </span>

      <div className="flex h-full min-w-0 items-center justify-center">
        <div
          className={cn(
            "flex h-[20px] items-center justify-center rounded-full transition-[width] duration-500 ease-out sm:h-[22px]",
            tone.fill
          )}
          style={{ width: `${width}%` }}
        >
          <span
            className={cn(
              "text-[10px] font-semibold tabular-nums tracking-tight sm:text-[10.5px]",
              tone.text
            )}
          >
            {percent}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function ExecutiveFunnelSummary({
  companyId,
}: ExecutiveFunnelSummaryProps) {
  const [summary, setSummary] = useState<FunnelDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadSummary = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const result = await getFunnelDashboardSummary(companyId);

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (result.error || !result.data) {
      setSummary(null);
      setError(result.error?.message ?? "Erro ao carregar o funil.");
      setLoading(false);
      return;
    }

    setSummary(result.data);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const firstStageCount = summary?.stages[0]?.count ?? 0;
  const baseCount =
    firstStageCount > 0
      ? firstStageCount
      : Math.max(0, ...(summary?.stages.map((stage) => stage.count) ?? [0]));

  return (
    <DashboardSectionCard
      title="Funil comercial"
      accent="rose"
      elevation="primary"
      titleIcon={
        <Funnel
          className="h-3.5 w-3.5 text-[#c05c7d]"
          strokeWidth={2}
          aria-hidden
        />
      }
      className={cn(
        "relative h-full w-full min-w-0 overflow-hidden rounded-[18px]",
        "border border-[#c05c7d]/18 bg-white",
        "shadow-[0_2px_10px_rgb(17_32_59/0.04),0_8px_20px_rgb(192_92_125/0.07)]",
        "hover:border-[#c05c7d]/35"
      )}
      headerClassName="items-center gap-2 border-b border-[var(--brand-navy)]/[0.06] px-3.5 pb-1.5 pt-3 sm:px-4 sm:pb-1.5 sm:pt-3"
      titleClassName="text-[15px] font-bold tracking-[-0.02em] text-[#0f1b33] sm:text-[16px]"
      contentClassName="flex min-h-0 flex-1 flex-col px-3.5 pb-2.5 pt-1 sm:px-4 sm:pb-2.5 sm:pt-1"
      action={
        <DashboardSectionLink
          href={ROUTES.funnel}
          className="rounded-full border border-[var(--brand-navy)]/10 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-[var(--brand-navy)]/65 shadow-[0_1px_2px_rgb(11_31_58/0.04)] transition-colors duration-200 hover:border-[var(--brand-gold)]/50 hover:text-[var(--brand-navy)] sm:px-2.5 sm:text-[11px]"
        >
          Ver funil
        </DashboardSectionLink>
      }
    >
      {error ? (
        <div className="mb-1.5 rounded-lg border border-[var(--brand-coral)]/25 bg-[var(--brand-coral)]/[0.08] px-2.5 py-1.5 text-[12px] text-[var(--brand-navy)]/80">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="grid h-6 grid-cols-[minmax(0,1fr)_auto_minmax(5.5rem,42%)] items-center gap-1.5"
              >
                <div className="h-2.5 w-full max-w-[8.5rem] animate-pulse rounded bg-[var(--brand-navy)]/[0.06]" />
                <div className="h-2.5 w-4 animate-pulse rounded bg-[var(--brand-navy)]/[0.05]" />
                <div className="mx-auto h-5 w-[65%] animate-pulse rounded-full bg-[var(--brand-navy)]/[0.06]" />
              </div>
            ))}
          </div>
          <div className="mt-auto h-[42px] animate-pulse rounded-[14px] border border-[var(--brand-coral)]/15 bg-[#f7eef1]" />
        </div>
      ) : summary ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-0.5">
            {summary.stages.map((row, index) => (
              <FunnelStageRow
                key={row.stage}
                row={row}
                index={index + 1}
                baseCount={baseCount}
              />
            ))}
          </div>

          <div className="mt-auto flex items-center gap-2 rounded-[14px] border border-[#e8c9d1]/70 bg-[#f7eef1] px-2.5 py-1.5 shadow-[0_1px_2px_rgb(192_92_125/0.06)] sm:gap-2.5 sm:px-3 sm:py-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#c05c7d]">
              <Target className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#c05c7d]">
                Taxa de conversão
              </p>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                <p className="text-[17px] font-semibold leading-none tabular-nums tracking-tight text-[var(--brand-navy)] sm:text-[18px]">
                  {formatConversionRate(summary.conversionRate)}
                </p>
                <p className="truncate text-[10px] text-[var(--brand-navy)]/40">
                  {summary.closedCount}/{summary.totalCount} oportunidades
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => void loadSummary()}
            className="text-[11.5px] font-medium text-[var(--brand-coral)] hover:text-[var(--brand-navy)]"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}
    </DashboardSectionCard>
  );
}
