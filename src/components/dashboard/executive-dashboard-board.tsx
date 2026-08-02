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

  if (loading) {
    return (
      <Card className="rounded-[16px] border-0 shadow-card">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-coral)]" />
          <span>Preparando sua visão executiva...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !dashboard) {
    return (
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
      ? "grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-5 xl:auto-rows-fr xl:grid-cols-3 xl:gap-6"
      : topVisibleCount === 2
        ? "grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:auto-rows-fr lg:grid-cols-2 lg:gap-6"
        : "grid min-w-0 grid-cols-1 gap-4 sm:gap-5";

  const middleCount = [capabilities.sales, capabilities.stock].filter(
    Boolean
  ).length;

  return (
    <div className="min-w-0 space-y-5 md:space-y-6 xl:space-y-7">
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
                  className="h-full w-full min-w-0"
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

      <section className="min-w-0 space-y-2">
        <div className="dash-reveal" style={{ animationDelay: "90ms" }}>
          <p className="text-[13px] font-semibold text-[var(--brand-navy)]/55">
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
        <section className="mb-2 min-w-0 space-y-2.5 md:mb-4 xl:mb-5">
          <div className="dash-reveal" style={{ animationDelay: "100ms" }}>
            <p className="text-[13px] font-semibold text-[var(--brand-navy)]/55">
              Resumo operacional
            </p>
          </div>
          <div
            className={
              middleCount === 2
                ? "grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-2 xl:gap-6"
                : "grid min-w-0 gap-4 sm:gap-5"
            }
          >
            {capabilities.sales ? (
              <div className="dash-reveal min-w-0" style={{ animationDelay: "120ms" }}>
                <DashboardSectionCard
                  title="Evolução das vendas"
                  titleClassName="text-[16px] font-bold tracking-[-0.02em] text-[#11203b]"
                  className="border border-[#11203b]/[0.075] bg-white shadow-[0_1px_2px_rgb(17_32_59/0.035),0_8px_22px_rgb(17_32_59/0.055)] hover:shadow-[0_2px_6px_rgb(17_32_59/0.045),0_12px_28px_rgb(17_32_59/0.075)]"
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
        <section className="min-w-0 space-y-2.5">
          <div className="dash-reveal" style={{ animationDelay: "260ms" }}>
            <p className="text-[13px] font-semibold text-[var(--brand-navy)]/55">
              Fluxo e vendas recentes
            </p>
          </div>
          <div className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-12 xl:gap-6">
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
                  titleClassName="text-[16px] font-bold tracking-[-0.02em] text-[#11203b]"
                  className="border border-[#11203b]/[0.06] bg-[#fffdfd] shadow-[0_1px_2px_rgb(17_32_59/0.03),0_8px_20px_rgb(17_32_59/0.045)] hover:shadow-[0_2px_6px_rgb(17_32_59/0.04),0_12px_26px_rgb(17_32_59/0.065)]"
                  contentClassName="min-w-0"
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
                  titleClassName="text-[16px] font-bold tracking-[-0.02em] text-[#11203b]"
                  className="border border-[#11203b]/[0.06] bg-[#fffdfd] shadow-[0_1px_2px_rgb(17_32_59/0.03),0_8px_20px_rgb(17_32_59/0.045)] hover:shadow-[0_2px_6px_rgb(17_32_59/0.04),0_12px_26px_rgb(17_32_59/0.065)]"
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
        <section className="min-w-0 space-y-2.5">
          <div className="dash-reveal" style={{ animationDelay: "340ms" }}>
            <p className="text-[13px] font-semibold text-[var(--brand-navy)]/55">
              Pendências e atividades
            </p>
          </div>
          <div className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-12 xl:gap-6">
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
