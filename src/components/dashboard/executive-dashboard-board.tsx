"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardListRow } from "@/components/dashboard/dashboard-list-row";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { DashboardSectionLink } from "@/components/dashboard/dashboard-section-link";
import { ExecutiveCashFlowChart } from "@/components/dashboard/executive-cash-flow-chart";
import { ExecutiveFinancialDonut } from "@/components/dashboard/executive-financial-donut";
import { ExecutiveKpiGrid } from "@/components/dashboard/executive-kpi-grid";
import { ExecutiveLists } from "@/components/dashboard/executive-lists";
import { ExecutiveQuickActions } from "@/components/dashboard/executive-quick-actions";
import { ExecutiveRecentActivities } from "@/components/dashboard/executive-recent-activities";
import { ExecutiveSalesChart } from "@/components/dashboard/executive-sales-chart";
import { ExecutiveStockSummary } from "@/components/dashboard/executive-stock-summary";
import { ExecutiveFunnelSummary } from "@/components/dashboard/executive-funnel-summary";
import { ExecutiveUpcomingAgenda } from "@/components/dashboard/executive-upcoming-agenda";
import { ExecutiveUpcomingTasks } from "@/components/dashboard/executive-upcoming-tasks";
import { getExecutiveDashboard } from "@/lib/dashboard/actions";
import {
  canViewDashboardSection,
  DASHBOARD_SECTIONS,
} from "@/lib/dashboard/capabilities";
import {
  formatCurrency,
  formatDateBR,
  currentMonthPeriod,
  toNumberAmount,
} from "@/lib/dashboard/format";
import { ROUTES, saleDetailPath } from "@/lib/constants";
import { useTenant } from "@/providers/tenant-provider";
import type { ExecutiveDashboard } from "@/types/database";

const RECENT_SALE_AVATAR_TONES = [
  "bg-[#11203b] text-white",
  "bg-[#e8c9d1] text-[#11203b]",
  "bg-[#c89b3c]/[0.22] text-[#11203b]",
] as const;

function salePartyInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

function saleAvatarTone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i)) % RECENT_SALE_AVATAR_TONES.length;
  }
  return RECENT_SALE_AVATAR_TONES[hash] ?? RECENT_SALE_AVATAR_TONES[0];
}

export function ExecutiveDashboardBoard() {
  const { company, role } = useTenant();
  const period = useMemo(() => currentMonthPeriod(), []);
  const [dashboard, setDashboard] = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const capabilities = useMemo(
    () => ({
      finance: canViewDashboardSection(DASHBOARD_SECTIONS.finance, { role }),
      sales: canViewDashboardSection(DASHBOARD_SECTIONS.sales, { role }),
      purchases: canViewDashboardSection(DASHBOARD_SECTIONS.purchases, {
        role,
      }),
      stock: canViewDashboardSection(DASHBOARD_SECTIONS.stock, { role }),
      shortcuts: canViewDashboardSection(DASHBOARD_SECTIONS.shortcuts, {
        role,
      }),
      tasks: canViewDashboardSection(DASHBOARD_SECTIONS.tasks, { role }),
      funnel: canViewDashboardSection(DASHBOARD_SECTIONS.funnel, { role }),
      agenda: canViewDashboardSection(DASHBOARD_SECTIONS.agenda, { role }),
    }),
    [role]
  );

  const loadDashboard = useCallback(async () => {
    if (!company?.id) {
      setDashboard(null);
      setLoading(false);
      setError("Selecione uma empresa ativa para ver o dashboard.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const result = await getExecutiveDashboard({
      companyId: company.id,
      periodFrom: period.from,
      periodTo: period.to,
    });

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (result.error || !result.data) {
      setDashboard(null);
      setError(result.error?.message ?? "Erro ao carregar o dashboard.");
      setLoading(false);
      return;
    }

    setDashboard(result.data);
    setLoading(false);
  }, [company?.id, period.from, period.to]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const agendaSection =
    capabilities.agenda && company?.id ? (
      <section className="min-w-0">
        <div
          className="dash-reveal w-full min-w-0"
          style={{ animationDelay: "30ms" }}
        >
          <ExecutiveUpcomingAgenda companyId={company.id} />
        </div>
      </section>
    ) : null;

  if (loading) {
    return (
      <div className="min-w-0 space-y-3 sm:space-y-3.5 md:space-y-4">
        {agendaSection}
        <Card className="rounded-[16px] border-0 shadow-card">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-coral)]" />
            <span>Preparando sua visão executiva...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-w-0 space-y-3 sm:space-y-3.5 md:space-y-4">
        {agendaSection}
        <Card className="rounded-[16px] border-0 shadow-card">
          <CardHeader>
            <CardTitle>Não foi possível carregar o dashboard</CardTitle>
            <CardDescription>
              {error ?? "Tente novamente em instantes."}
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button
              type="button"
              onClick={() => void loadDashboard()}
              className="rounded-full bg-[var(--brand-coral)] px-5 hover:bg-[var(--brand-coral)]/90"
            >
              Tentar novamente
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const showTopFunnel = Boolean(capabilities.funnel && company?.id);
  const showTopTasks = Boolean(capabilities.tasks && company?.id);
  const showTopFinance = capabilities.finance;
  const showTopRow = showTopFunnel || showTopTasks || showTopFinance;
  const topVisibleCount = [showTopFunnel, showTopFinance, showTopTasks].filter(
    Boolean
  ).length;

  const topGridClass =
    topVisibleCount >= 3
      ? "grid min-w-0 grid-cols-1 gap-3 sm:gap-3.5 md:grid-cols-2 md:gap-3.5 xl:auto-rows-fr xl:grid-cols-3 xl:gap-4"
      : topVisibleCount === 2
        ? "grid min-w-0 grid-cols-1 gap-3 sm:gap-3.5 lg:auto-rows-fr lg:grid-cols-2 lg:gap-4"
        : "grid min-w-0 grid-cols-1 gap-3 sm:gap-3.5";

  const middleCount = [capabilities.sales, capabilities.stock].filter(
    Boolean
  ).length;

  return (
    <div className="min-w-0 space-y-3 sm:space-y-3.5 md:space-y-4">
      {agendaSection}

      {capabilities.shortcuts ? (
        <div className="dash-reveal w-full min-w-0" style={{ animationDelay: "40ms" }}>
          <ExecutiveQuickActions />
        </div>
      ) : null}

      {showTopRow ? (
        <section className="min-w-0">
          {/*
            Grade superior do Dashboard:
            Funil comercial | Resumo financeiro | Próximas tarefas
          */}
          <div className={topGridClass}>
            {showTopFunnel && company?.id ? (
              <div
                className="dash-reveal flex min-h-0 min-w-0 xl:h-full"
                style={{ animationDelay: "40ms" }}
              >
                <ExecutiveFunnelSummary companyId={company.id} />
              </div>
            ) : null}

            {showTopFinance ? (
              <div
                className="dash-reveal flex min-h-0 min-w-0 xl:h-full"
                style={{ animationDelay: "50ms" }}
              >
                <DashboardSectionCard
                  title="Resumo financeiro"
                  accent="green"
                  className="h-full w-full min-w-0 border border-[#6a9e88]/25 bg-white shadow-[0_2px_12px_rgb(106_158_136/0.08)] hover:border-[#6a9e88]/45"
                  titleClassName="text-[15px] font-bold tracking-[-0.02em] text-[#0f1b33] sm:text-[16px]"
                  contentClassName="min-w-0"
                >
                  <ExecutiveFinancialDonut kpis={dashboard.kpis} />
                </DashboardSectionCard>
              </div>
            ) : null}

            {showTopTasks && company?.id ? (
              <div
                className={
                  topVisibleCount >= 3
                    ? "dash-reveal flex min-h-0 min-w-0 md:col-span-2 xl:col-span-1 xl:h-full"
                    : "dash-reveal flex min-h-0 min-w-0 xl:h-full"
                }
                style={{ animationDelay: "70ms" }}
              >
                <ExecutiveUpcomingTasks companyId={company.id} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="min-w-0 space-y-1.5">
        <div className="dash-reveal" style={{ animationDelay: "90ms" }}>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--brand-navy)]/50 sm:text-[12px]">
            Indicadores principais
          </p>
        </div>
        <ExecutiveKpiGrid
          kpis={dashboard.kpis}
          cashFlowSeries={dashboard.cash_flow_series}
          salesSeries={dashboard.sales_series}
          showFinance={capabilities.finance}
          showSales={capabilities.sales}
          showPurchases={capabilities.purchases}
        />
      </section>

      {(capabilities.sales || capabilities.stock) && (
        <section className="min-w-0 space-y-1.5">
          <div className="dash-reveal" style={{ animationDelay: "100ms" }}>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--brand-navy)]/50 sm:text-[12px]">
              Resumo operacional
            </p>
          </div>
          <div
            className={
              middleCount === 2
                ? "grid min-w-0 gap-3 sm:gap-3.5 xl:grid-cols-2 xl:gap-4"
                : "grid min-w-0 gap-3 sm:gap-3.5"
            }
          >
            {capabilities.sales ? (
              <div className="dash-reveal min-w-0" style={{ animationDelay: "120ms" }}>
                <DashboardSectionCard
                  title="Evolução das vendas"
                  accent="gold"
                  titleClassName="text-[16px] font-bold tracking-[-0.02em] text-[#0f1b33]"
                  className="border border-[var(--brand-gold)]/35 bg-white shadow-[0_2px_12px_rgb(200_155_60/0.08),0_10px_24px_rgb(17_32_59/0.04)] hover:border-[var(--brand-gold)]/55"
                  contentClassName="pt-0.5"
                >
                  <ExecutiveSalesChart
                    series={dashboard.sales_series}
                    averageTicket={dashboard.kpis.average_ticket}
                    compact
                  />
                </DashboardSectionCard>
              </div>
            ) : null}

            {capabilities.stock ? (
              <div
                className="dash-reveal min-w-0"
                style={{ animationDelay: "180ms" }}
              >
                <ExecutiveStockSummary
                  kpis={dashboard.kpis}
                  lowStockProducts={dashboard.low_stock_products}
                  compact
                />
              </div>
            ) : null}
          </div>
        </section>
      )}

      {(capabilities.finance || capabilities.sales) && (
        <section className="min-w-0 space-y-1.5">
          <div className="dash-reveal" style={{ animationDelay: "260ms" }}>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--brand-navy)]/50 sm:text-[12px]">
              Fluxo e vendas recentes
            </p>
          </div>
          <div className="grid min-w-0 gap-3 sm:gap-3.5 xl:grid-cols-12 xl:gap-4">
            {capabilities.finance ? (
              <div
                className={
                  capabilities.sales
                    ? "dash-reveal min-w-0 xl:col-span-7"
                    : "dash-reveal min-w-0 xl:col-span-12"
                }
                style={{ animationDelay: "280ms" }}
              >
                <DashboardSectionCard
                  title="Entradas e saídas"
                  accent="green"
                  titleClassName="text-[16px] font-bold tracking-[-0.02em] text-[#0f1b33]"
                  className="border border-[#6a9e88]/25 bg-[#fffdfd] shadow-[0_2px_12px_rgb(106_158_136/0.08),0_10px_22px_rgb(17_32_59/0.04)] hover:border-[#6a9e88]/45"
                  contentClassName="min-w-0 pt-0.5"
                >
                  <ExecutiveCashFlowChart series={dashboard.cash_flow_series} />
                </DashboardSectionCard>
              </div>
            ) : null}

            {capabilities.sales ? (
              <div
                className={
                  capabilities.finance
                    ? "dash-reveal min-w-0 xl:col-span-5"
                    : "dash-reveal min-w-0 xl:col-span-12"
                }
                style={{ animationDelay: "320ms" }}
              >
                <DashboardSectionCard
                  title="Últimas vendas"
                  accent="gold"
                  titleClassName="text-[16px] font-bold tracking-[-0.02em] text-[#0f1b33]"
                  className="border border-[var(--brand-gold)]/30 bg-[#fffdfd] shadow-[0_2px_12px_rgb(200_155_60/0.07),0_10px_22px_rgb(17_32_59/0.04)] hover:border-[var(--brand-gold)]/50"
                  headerClassName="items-center"
                  action={
                    <DashboardSectionLink
                      href={ROUTES.sales}
                      className="rounded-full bg-[#c05c7d]/[0.08] px-3 py-1 text-[12px] font-semibold text-[#c05c7d] transition-colors duration-200 hover:bg-[#e8c9d1]/55 hover:text-[#c89b3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c89b3c]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdfd]"
                    >
                      Ver todas
                    </DashboardSectionLink>
                  }
                >
                  {!dashboard.recent_sales.length ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                      <p className="text-sm font-medium text-[#11203b]/55">
                        Nenhuma venda registrada no período.
                      </p>
                      <Link
                        href={ROUTES.salesNew}
                        className="rounded-full px-3 py-1 text-[12px] font-semibold text-[#c05c7d] transition-colors duration-200 hover:bg-[#e8c9d1]/40 hover:text-[#c89b3c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c89b3c]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdfd]"
                      >
                        Nova venda
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#11203b]/[0.045]">
                      {dashboard.recent_sales.map((sale) => (
                        <DashboardListRow
                          key={sale.id}
                          href={saleDetailPath(sale.id)}
                          title={sale.party_name}
                          meta={`${formatDateBR(sale.sale_date)}${
                            sale.document_number
                              ? ` • ${sale.document_number}`
                              : ""
                          }`}
                          amount={formatCurrency(
                            toNumberAmount(sale.total_amount)
                          )}
                          initials={salePartyInitials(sale.party_name)}
                          avatarClassName={saleAvatarTone(sale.party_name)}
                        />
                      ))}
                    </div>
                  )}
                </DashboardSectionCard>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {(capabilities.finance || capabilities.purchases) && (
        <section className="min-w-0 space-y-1.5">
          <div className="dash-reveal" style={{ animationDelay: "340ms" }}>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--brand-navy)]/50 sm:text-[12px]">
              Pendências e atividades
            </p>
          </div>
          <div className="grid min-w-0 gap-3 sm:gap-3.5 xl:grid-cols-12 xl:gap-4">
            <div
              className={
                capabilities.finance
                  ? "dash-reveal min-w-0 xl:col-span-7"
                  : "dash-reveal min-w-0 xl:col-span-12"
              }
              style={{ animationDelay: "360ms" }}
            >
              <ExecutiveLists
                data={dashboard}
                showFinance={capabilities.finance}
                showPurchases={capabilities.purchases}
              />
            </div>

            {capabilities.finance ? (
              <div
                className="dash-reveal min-w-0 xl:col-span-5"
                style={{ animationDelay: "400ms" }}
              >
                <ExecutiveRecentActivities
                  activities={dashboard.recent_financial_activities}
                />
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
