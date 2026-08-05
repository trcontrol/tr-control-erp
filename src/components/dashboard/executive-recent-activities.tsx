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
      accent="green"
      elevation="secondary"
      className="border border-[#6a9e88]/20 bg-white shadow-[0_2px_12px_rgb(17_32_59/0.045)] hover:border-[#6a9e88]/40"
      titleClassName="text-[15px] font-bold tracking-[-0.02em] text-[#0f1b33]"
      action={
        <DashboardSectionLink href={ROUTES.cashFlow}>
          Ver todas
        </DashboardSectionLink>
      }
    >
      {!items.length ? (
        <p className="py-8 text-sm text-muted-foreground">
          Nenhuma movimentação financeira recente.
        </p>
      ) : (
        <div className="space-y-0.5 pt-0.5">
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
