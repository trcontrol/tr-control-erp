"use client";

import { DashboardListRow } from "@/components/dashboard/dashboard-list-row";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { DashboardSectionLink } from "@/components/dashboard/dashboard-section-link";
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

function ListBlock({
  title,
  href,
  empty,
  items,
}: {
  title: string;
  href: string;
  empty: string;
  items: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--brand-navy)]/75">
          {title}
        </h3>
        <DashboardSectionLink href={href}>Ver</DashboardSectionLink>
      </div>
      {items ?? (
        <p className="py-5 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

export function ExecutiveLists({
  data,
  showFinance = true,
  showPurchases = true,
}: ExecutiveListsProps) {
  if (!showFinance && !showPurchases) {
    return null;
  }

  const columnCount = (showPurchases ? 1 : 0) + (showFinance ? 2 : 0);

  return (
    <DashboardSectionCard
      title="Pendências e operações"
      elevation="secondary"
      action={
        <DashboardSectionLink href={ROUTES.finance}>
          Ver todas
        </DashboardSectionLink>
      }
    >
      <div
        className={
          columnCount >= 3
            ? "grid gap-6 lg:grid-cols-3 lg:gap-7"
            : columnCount === 2
              ? "grid gap-6 sm:grid-cols-2"
              : "grid gap-6"
        }
      >
        {showPurchases ? (
          <ListBlock
            title="Compras"
            href={ROUTES.purchases}
            empty="Nenhuma compra confirmada."
            items={
              data.recent_purchases.length ? (
                <div className="divide-y divide-[var(--brand-navy)]/[0.045]">
                  {data.recent_purchases.slice(0, 4).map((purchase) => (
                    <DashboardListRow
                      key={purchase.id}
                      href={purchaseDetailPath(purchase.id)}
                      title={purchase.party_name}
                      meta={formatDateBR(purchase.purchase_date)}
                      amount={formatCurrency(
                        toNumberAmount(purchase.total_amount)
                      )}
                    />
                  ))}
                </div>
              ) : null
            }
          />
        ) : null}

        {showFinance ? (
          <ListBlock
            title="A receber"
            href={ROUTES.finance}
            empty="Sem vencimentos futuros."
            items={
              data.upcoming_receivables.length ? (
                <div className="divide-y divide-[var(--brand-navy)]/[0.045]">
                  {data.upcoming_receivables.slice(0, 4).map((entry) => (
                    <DashboardListRow
                      key={entry.id}
                      href={financeDetailPath(entry.id)}
                      title={entry.party_name || entry.description}
                      meta={formatDateBR(entry.due_date)}
                      amount={formatCurrency(toNumberAmount(entry.amount))}
                      amountClassName="text-emerald-700"
                    />
                  ))}
                </div>
              ) : null
            }
          />
        ) : null}

        {showFinance ? (
          <ListBlock
            title="A pagar"
            href={ROUTES.finance}
            empty="Sem vencimentos futuros."
            items={
              data.upcoming_payables.length ? (
                <div className="divide-y divide-[var(--brand-navy)]/[0.045]">
                  {data.upcoming_payables.slice(0, 4).map((entry) => (
                    <DashboardListRow
                      key={entry.id}
                      href={financeDetailPath(entry.id)}
                      title={entry.party_name || entry.description}
                      meta={formatDateBR(entry.due_date)}
                      amount={formatCurrency(toNumberAmount(entry.amount))}
                      amountClassName="text-[var(--brand-coral)]"
                    />
                  ))}
                </div>
              ) : null
            }
          />
        ) : null}
      </div>
    </DashboardSectionCard>
  );
}
