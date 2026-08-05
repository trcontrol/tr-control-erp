"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { ExecutiveDashboard } from "@/types/database";

type ListAccent = "navy" | "gold" | "rosa";

type ExecutiveListsProps = {
  data: ExecutiveDashboard;
  showFinance?: boolean;
  showPurchases?: boolean;
};

const ACCENT_STYLES: Record<
  ListAccent,
  { iconWrap: string; icon: string; amount: string }
> = {
  navy: {
    iconWrap: "bg-[var(--brand-navy)]/[0.08]",
    icon: "text-[var(--brand-navy)]",
    amount: "font-bold text-[var(--brand-navy)]",
  },
  gold: {
    iconWrap: "bg-[var(--brand-gold)]/15",
    icon: "text-[var(--brand-gold)]",
    amount: "font-bold text-[var(--brand-gold)]",
  },
  rosa: {
    iconWrap: "bg-[var(--brand-coral)]/15",
    icon: "text-[var(--brand-coral)]",
    amount: "font-bold text-[var(--brand-coral)]",
  },
};

function ListBlock({
  title,
  href,
  empty,
  items,
  icon: Icon,
  accent,
}: {
  title: string;
  href: string;
  empty: string;
  items: React.ReactNode;
  icon: LucideIcon;
  accent: ListAccent;
}) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-[var(--brand-navy)]/[0.06]",
        "bg-[var(--brand-surface)]/70 px-3 py-3.5 sm:px-5 sm:py-5",
        "shadow-[0_1px_3px_rgb(11_31_58/0.04)]",
        "transition-all duration-300 ease-out",
        "hover:border-[var(--brand-navy)]/[0.1]",
        "hover:shadow-[0_6px_20px_rgb(11_31_58/0.07)]"
      )}
    >
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2 border-b border-[var(--brand-navy)]/[0.06] pb-3 sm:mb-3.5 sm:pb-3.5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8",
              styles.iconWrap
            )}
          >
            <Icon
              className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", styles.icon)}
              strokeWidth={2.2}
            />
          </span>
          <h3 className="truncate text-left text-[12.5px] font-semibold text-[var(--brand-navy)] sm:text-[13px]">
            {title}
          </h3>
        </div>
        <DashboardSectionLink
          href={href}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--brand-navy)]/35 transition-colors duration-200 hover:bg-[var(--brand-navy)]/[0.05] hover:text-[var(--brand-navy)]/70"
        >
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          <span className="sr-only">Ver {title}</span>
        </DashboardSectionLink>
      </div>
      {items ?? (
        <p className="py-6 text-sm text-muted-foreground">{empty}</p>
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
      accent="coral"
      elevation="secondary"
      className="border border-[var(--brand-coral)]/20 bg-white shadow-[0_2px_12px_rgb(17_32_59/0.045)] hover:border-[var(--brand-coral)]/35"
      titleClassName="text-[15px] font-bold tracking-[-0.02em] text-[#0f1b33]"
      action={
        <DashboardSectionLink href={ROUTES.finance}>
          Ver todas
        </DashboardSectionLink>
      }
    >
      <div
        className={
          columnCount >= 3
            ? "grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6"
            : columnCount === 2
              ? "grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5"
              : "grid min-w-0 gap-4 sm:gap-5"
        }
      >
        {showPurchases ? (
          <ListBlock
            title="Compras"
            href={ROUTES.purchases}
            empty="Nenhuma compra confirmada."
            icon={ShoppingCart}
            accent="navy"
            items={
              data.recent_purchases.length ? (
                <div className="divide-y divide-[var(--brand-navy)]/[0.05]">
                  {data.recent_purchases.slice(0, 4).map((purchase) => (
                    <DashboardListRow
                      key={purchase.id}
                      href={purchaseDetailPath(purchase.id)}
                      title={purchase.party_name}
                      meta={formatDateBR(purchase.purchase_date)}
                      amount={formatCurrency(
                        toNumberAmount(purchase.total_amount)
                      )}
                      amountClassName={ACCENT_STYLES.navy.amount}
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
            icon={ArrowDownLeft}
            accent="gold"
            items={
              data.upcoming_receivables.length ? (
                <div className="divide-y divide-[var(--brand-navy)]/[0.05]">
                  {data.upcoming_receivables.slice(0, 4).map((entry) => (
                    <DashboardListRow
                      key={entry.id}
                      href={financeDetailPath(entry.id)}
                      title={entry.party_name || entry.description}
                      meta={formatDateBR(entry.due_date)}
                      amount={formatCurrency(toNumberAmount(entry.amount))}
                      amountClassName={ACCENT_STYLES.gold.amount}
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
            icon={ArrowUpRight}
            accent="rosa"
            items={
              data.upcoming_payables.length ? (
                <div className="divide-y divide-[var(--brand-navy)]/[0.05]">
                  {data.upcoming_payables.slice(0, 4).map((entry) => (
                    <DashboardListRow
                      key={entry.id}
                      href={financeDetailPath(entry.id)}
                      title={entry.party_name || entry.description}
                      meta={formatDateBR(entry.due_date)}
                      amount={formatCurrency(toNumberAmount(entry.amount))}
                      amountClassName={ACCENT_STYLES.rosa.amount}
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
