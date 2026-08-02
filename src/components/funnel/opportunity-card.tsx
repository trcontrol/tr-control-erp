"use client";

import Link from "next/link";
import { CalendarDays, UserRound } from "lucide-react";
import { Select } from "@/components/ui/select";
import {
  OPPORTUNITY_STAGE_OPTIONS,
  opportunityDetailPath,
} from "@/lib/constants";
import type { OpportunityWithRelations } from "@/lib/funnel/actions";
import {
  customerDisplayName,
  formatOpportunityCurrency,
  formatOpportunityDate,
  isNextActionOverdue,
  opportunityStageAccent,
} from "@/lib/funnel/format";
import { cn } from "@/lib/utils";

type OpportunityCardProps = {
  opportunity: OpportunityWithRelations;
  onStageChange: (opportunityId: string, stage: string) => void;
  stageLoading?: boolean;
};

export function OpportunityCard({
  opportunity,
  onStageChange,
  stageLoading = false,
}: OpportunityCardProps) {
  const accent = opportunityStageAccent(opportunity.stage);
  const overdue = isNextActionOverdue({
    nextActionDate: opportunity.next_action_date,
    stage: opportunity.stage,
    status: opportunity.status,
  });

  return (
    <article
      className={cn(
        "group rounded-xl border border-[var(--brand-navy)]/8 bg-white shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]",
        "ring-1",
        accent.ring
      )}
    >
      <div className={cn("h-1 rounded-t-xl", accent.bar)} />

      <div className="space-y-3 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <Link
              href={opportunityDetailPath(opportunity.id)}
              className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--brand-navy)] hover:text-[var(--brand-coral)]"
            >
              {opportunity.title}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {customerDisplayName(opportunity.customer)}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-[var(--brand-gold)]">
            {formatOpportunityCurrency(opportunity.estimated_value)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3 w-3" />
            {opportunity.assigned_user?.full_name || "Sem responsável"}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1",
              overdue && "font-medium text-[var(--brand-coral)]"
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {formatOpportunityDate(opportunity.next_action_date)}
          </span>
        </div>

        <Select
          aria-label="Alterar etapa"
          value={opportunity.stage}
          disabled={stageLoading}
          onChange={(event) =>
            onStageChange(opportunity.id, event.target.value)
          }
          className="h-8 text-xs"
        >
          {OPPORTUNITY_STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </article>
  );
}
