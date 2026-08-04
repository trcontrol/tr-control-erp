"use client";

import type { OpportunityWithRelations } from "@/lib/funnel/actions";
import {
  formatOpportunityCurrency,
  opportunityStageAccent,
  opportunityStageLabel,
} from "@/lib/funnel/format";
import { OpportunityCard } from "@/components/funnel/opportunity-card";
import { cn } from "@/lib/utils";

type FunnelColumnProps = {
  stage: string;
  opportunities: OpportunityWithRelations[];
  totalValue: number;
  onStageChange: (opportunityId: string, stage: string) => void;
  stageLoadingId: string | null;
};

export function FunnelColumn({
  stage,
  opportunities,
  totalValue,
  onStageChange,
  stageLoadingId,
}: FunnelColumnProps) {
  const accent = opportunityStageAccent(stage);

  return (
    <section className="flex min-h-[280px] min-w-0 flex-col rounded-2xl bg-[var(--brand-surface-soft)]/70 ring-1 ring-[var(--brand-navy)]/6">
      <header className="space-y-1 border-b border-[var(--brand-navy)]/6 px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", accent.bar)} />
            <h2 className="truncate text-sm font-semibold text-[var(--brand-navy)]">
              {opportunityStageLabel(stage)}
            </h2>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
              accent.soft,
              accent.text
            )}
          >
            {opportunities.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatOpportunityCurrency(totalValue)}
        </p>
      </header>

      <div className="flex max-h-[min(70vh,560px)] flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
        {opportunities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--brand-navy)]/12 bg-white/50 px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhuma oportunidade
          </div>
        ) : (
          opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onStageChange={onStageChange}
              stageLoading={stageLoadingId === opportunity.id}
            />
          ))
        )}
      </div>
    </section>
  );
}
