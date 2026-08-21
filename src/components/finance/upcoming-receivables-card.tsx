"use client";

import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FINANCIAL_STATUS, financeDetailPath } from "@/lib/constants";
import type { FinancialEntryWithRelations } from "@/lib/finance/actions";
import { formatCurrency, formatDateBR } from "@/lib/finance/format";
import {
  UPCOMING_RECEIVABLES_PREVIEW_LIMIT,
  UPCOMING_RECEIVABLES_WINDOW_OPTIONS,
  installmentLabel,
  receivablePartyLabel,
  sumEntryAmounts,
  upcomingReceivablesEmptyMessage,
  upcomingReceivablesTitle,
  type UpcomingReceivablesWindow,
} from "@/lib/finance/upcoming";
import { cn } from "@/lib/utils";

type UpcomingReceivablesCardProps = {
  entries: FinancialEntryWithRelations[];
  window: UpcomingReceivablesWindow;
  onWindowChange: (window: UpcomingReceivablesWindow) => void;
  loading?: boolean;
  listAnchorId: string;
};

function statusLabel(status: string) {
  if (status === FINANCIAL_STATUS.overdue) return "Vencido";
  if (status === FINANCIAL_STATUS.pending) return "Pendente";
  return status;
}

export function UpcomingReceivablesCard({
  entries,
  window,
  onWindowChange,
  loading,
  listAnchorId,
}: UpcomingReceivablesCardProps) {
  const total = sumEntryAmounts(entries);
  const preview = entries.slice(0, UPCOMING_RECEIVABLES_PREVIEW_LIMIT);
  const hasMore = entries.length > UPCOMING_RECEIVABLES_PREVIEW_LIMIT;

  function scrollToList() {
    const el = document.getElementById(listAnchorId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base">
              {upcomingReceivablesTitle(window)}
            </CardTitle>
            <CardDescription>
              Títulos abertos futuros · até 5 itens no preview
            </CardDescription>
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-2 text-right">
            <p className="text-xs text-muted-foreground">
              Total a receber no período
            </p>
            <p className="text-xl font-semibold tracking-tight">
              {loading ? "…" : formatCurrency(total)}
            </p>
          </div>
        </div>

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Período dos recebíveis"
        >
          {UPCOMING_RECEIVABLES_WINDOW_OPTIONS.map((option) => {
            const active = option.value === window;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => onWindowChange(option.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : preview.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {upcomingReceivablesEmptyMessage(window)}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {preview.map((entry) => {
              const party = receivablePartyLabel(entry);
              const parcela = installmentLabel(entry);
              const title =
                parcela === "—"
                  ? `${party} · À vista`
                  : `${party} · Parcela ${parcela}`;

              return (
                <li key={entry.id}>
                  <Link
                    href={financeDetailPath(entry.id)}
                    className="flex items-start justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateBR(entry.due_date)}
                        {" · "}
                        {statusLabel(entry.status)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatCurrency(entry.amount)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={scrollToList}
            >
              <ArrowDown className="h-4 w-4" />
              Ver todos os recebíveis
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
