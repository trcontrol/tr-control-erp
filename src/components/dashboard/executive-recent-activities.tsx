"use client";

import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { DashboardSectionLink } from "@/components/dashboard/dashboard-section-link";
import { DashboardTimelineItem } from "@/components/dashboard/dashboard-timeline-item";
import { financeDetailPath, ROUTES } from "@/lib/constants";
import { originLabel, statusLabel } from "@/lib/cash-flow/format";
import {
  formatCurrency,
  formatDateBR,
  toNumberAmount,
} from "@/lib/dashboard/format";
import type { ExecutiveDashboard } from "@/types/database";

const MAX_ACTIVITIES = 5;

type ExecutiveRecentActivitiesProps = {
  activities: ExecutiveDashboard["recent_financial_activities"];
};

export function ExecutiveRecentActivities({
  activities,
}: ExecutiveRecentActivitiesProps) {
  const items = activities.slice(0, MAX_ACTIVITIES);

  return (
    <DashboardSectionCard
      title="Atividades recentes"
      action={
        <DashboardSectionLink href={ROUTES.cashFlow}>
          Ver todas
        </DashboardSectionLink>
      }
    >
      {!items.length ? (
        <p className="py-6 text-sm text-muted-foreground">
          Nenhuma movimentação financeira recente.
        </p>
      ) : (
        <div className="pt-0.5">
          {items.map((activity, index) => {
            const isInflow = activity.type === "entrada";
            return (
              <DashboardTimelineItem
                key={activity.id}
                href={financeDetailPath(activity.id)}
                title={activity.description || "Sem descrição"}
                meta={`${formatDateBR(activity.date)} · ${statusLabel(activity.status)}`}
                amount={formatCurrency(toNumberAmount(activity.amount))}
                typeLabel={isInflow ? "Entrada" : "Saída"}
                typeTone={isInflow ? "positive" : "negative"}
                originLabel={originLabel(activity.origin)}
                isLast={index === items.length - 1}
              />
            );
          })}
        </div>
      )}
    </DashboardSectionCard>
  );
}
