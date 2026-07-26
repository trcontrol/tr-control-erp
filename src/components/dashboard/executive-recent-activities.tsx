"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { financeDetailPath, ROUTES } from "@/lib/constants";
import { originLabel, statusLabel } from "@/lib/cash-flow/format";
import {
  formatCurrency,
  formatDateBR,
  toNumberAmount,
} from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";
import type { ExecutiveDashboard } from "@/types/database";

type ExecutiveRecentActivitiesProps = {
  activities: ExecutiveDashboard["recent_financial_activities"];
};

export function ExecutiveRecentActivities({
  activities,
}: ExecutiveRecentActivitiesProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Atividades financeiras recentes</CardTitle>
          <CardDescription>
            Últimas movimentações da empresa ativa
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.cashFlow}>Fluxo de caixa</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!activities.length ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma movimentação financeira recente.
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const isInflow = activity.type === "entrada";
              return (
                <Link
                  key={activity.id}
                  href={financeDetailPath(activity.id)}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] font-medium",
                          isInflow
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-[var(--brand-coral)]/10 text-[var(--brand-coral)]"
                        )}
                      >
                        {isInflow ? "Entrada" : "Saída"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {originLabel(activity.origin)}
                      </span>
                    </div>
                    <div className="mt-1 truncate font-medium">
                      {activity.description || "Sem descrição"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDateBR(activity.date)} ·{" "}
                      {statusLabel(activity.status)}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "shrink-0 text-right text-sm font-medium",
                      isInflow
                        ? "text-emerald-700"
                        : "text-[var(--brand-coral)]"
                    )}
                  >
                    {formatCurrency(toNumberAmount(activity.amount))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
