"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardListRow } from "@/components/dashboard/dashboard-list-row";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import {
  ROUTES,
  financeDetailPath,
  purchaseDetailPath,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDateBR,
  toNumberAmount,
} from "@/lib/dashboard/format";
import type { ExecutiveDashboard } from "@/types/database";

type ExecutiveListsProps = {
  data: ExecutiveDashboard;
  showFinance?: boolean;
  showPurchases?: boolean;
};

export function ExecutiveLists({
  data,
  showFinance = true,
  showPurchases = true,
}: ExecutiveListsProps) {
  if (!showFinance && !showPurchases) {
    return null;
  }

  return (
    <div
      className={
        showFinance && showPurchases
          ? "grid min-w-0 gap-4 xl:grid-cols-3"
          : "grid min-w-0 gap-4 lg:grid-cols-2"
      }
    >
      {showPurchases ? (
        <DashboardSectionCard
          title="Últimas compras"
          description="Confirmadas da empresa ativa"
          action={
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href={ROUTES.purchases}>Ver todas</Link>
            </Button>
          }
        >
          {!data.recent_purchases.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma compra confirmada ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {data.recent_purchases.map((purchase) => (
                <DashboardListRow
                  key={purchase.id}
                  href={purchaseDetailPath(purchase.id)}
                  title={purchase.party_name}
                  meta={`${formatDateBR(purchase.purchase_date)}${
                    purchase.document_number
                      ? ` · ${purchase.document_number}`
                      : ""
                  }`}
                  amount={formatCurrency(toNumberAmount(purchase.total_amount))}
                />
              ))}
            </div>
          )}
        </DashboardSectionCard>
      ) : null}

      {showFinance ? (
        <>
          <DashboardSectionCard
            title="Próximas contas a receber"
            description="Somente vencimentos futuros"
            action={
              <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                <Link href={ROUTES.finance}>Financeiro</Link>
              </Button>
            }
          >
            {!data.upcoming_receivables.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma conta a receber com vencimento futuro.
              </p>
            ) : (
              <div className="space-y-2">
                {data.upcoming_receivables.map((entry) => (
                  <DashboardListRow
                    key={entry.id}
                    href={financeDetailPath(entry.id)}
                    title={entry.party_name || entry.description}
                    meta={`Vence em ${formatDateBR(entry.due_date)}`}
                    amount={formatCurrency(toNumberAmount(entry.amount))}
                    amountClassName="text-emerald-700"
                  />
                ))}
              </div>
            )}
          </DashboardSectionCard>

          <DashboardSectionCard
            title="Próximas contas a pagar"
            description="Somente vencimentos futuros"
            action={
              <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                <Link href={ROUTES.finance}>Financeiro</Link>
              </Button>
            }
          >
            {!data.upcoming_payables.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma conta a pagar com vencimento futuro.
              </p>
            ) : (
              <div className="space-y-2">
                {data.upcoming_payables.map((entry) => (
                  <DashboardListRow
                    key={entry.id}
                    href={financeDetailPath(entry.id)}
                    title={entry.party_name || entry.description}
                    meta={`Vence em ${formatDateBR(entry.due_date)}`}
                    amount={formatCurrency(toNumberAmount(entry.amount))}
                    amountClassName="text-[var(--brand-coral)]"
                  />
                ))}
              </div>
            )}
          </DashboardSectionCard>
        </>
      ) : null}
    </div>
  );
}
