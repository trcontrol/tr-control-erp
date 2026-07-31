"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const middleCount = [
    capabilities.sales,
    capabilities.finance,
    capabilities.stock,
  ].filter(Boolean).length;

  return (
    <div className="min-w-0 space-y-5 md:space-y-7">
      {capabilities.shortcuts ? (
        <div className="dash-reveal w-full min-w-0" style={{ animationDelay: "40ms" }}>
          <ExecutiveQuickActions />
        </div>
      ) : null}

      <section className="min-w-0 space-y-2">
        <div className="dash-reveal" style={{ animationDelay: "60ms" }}>
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

      {(capabilities.sales || capabilities.finance || capabilities.stock) && (
        <section className="min-w-0 space-y-2.5">
          <div className="dash-reveal" style={{ animationDelay: "100ms" }}>
            <p className="text-[13px] font-semibold text-[var(--brand-navy)]/55">
              Resumo financeiro e operacional
            </p>
          </div>
          <div
            className={
              middleCount === 3
                ? "grid min-w-0 gap-5 xl:grid-cols-2 xl:gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.9fr)]"
                : middleCount === 2
                  ? "grid min-w-0 gap-5 xl:grid-cols-2 xl:gap-6"
                  : "grid min-w-0 gap-5"
            }
          >
            {capabilities.sales ? (
              <div className="dash-reveal min-w-0" style={{ animationDelay: "120ms" }}>
                <DashboardSectionCard title="Evolução das vendas">
                  <ExecutiveSalesChart
                    series={dashboard.sales_series}
                    averageTicket={dashboard.kpis.average_ticket}
                    compact
                  />
                </DashboardSectionCard>
              </div>
            ) : null}

            {capabilities.finance ? (
              <div className="dash-reveal min-w-0" style={{ animationDelay: "180ms" }}>
                <DashboardSectionCard title="Resumo financeiro">
                  <ExecutiveFinancialDonut kpis={dashboard.kpis} compact />
                </DashboardSectionCard>
              </div>
            ) : null}

            {capabilities.stock ? (
              <div
                className={
                  middleCount === 3
                    ? "dash-reveal min-w-0 xl:col-span-2 2xl:col-span-1"
                    : "dash-reveal min-w-0"
                }
                style={{ animationDelay: "240ms" }}
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
          <div className="grid min-w-0 gap-5 xl:grid-cols-12 xl:gap-6">
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
                  elevation="secondary"
                  action={
                    <DashboardSectionLink href={ROUTES.sales}>
                      Ver todas
                    </DashboardSectionLink>
                  }
                >
                  {!dashboard.recent_sales.length ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma venda confirmada ainda.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--brand-navy)]/[0.045]">
                      {dashboard.recent_sales.map((sale) => (
                        <DashboardListRow
                          key={sale.id}
                          href={saleDetailPath(sale.id)}
                          title={sale.party_name}
                          meta={`${formatDateBR(sale.sale_date)}${
                            sale.document_number
                              ? ` · ${sale.document_number}`
                              : ""
                          }`}
                          amount={formatCurrency(
                            toNumberAmount(sale.total_amount)
                          )}
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
          <div className="grid min-w-0 gap-5 xl:grid-cols-12 xl:gap-6">
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

      {capabilities.tasks && company?.id ? (
        <section className="min-w-0 space-y-2.5">
          <div className="dash-reveal" style={{ animationDelay: "420ms" }}>
            <p className="text-[13px] font-semibold text-[var(--brand-navy)]/55">
              Rotina
            </p>
          </div>
          <div className="grid min-w-0 gap-5 xl:grid-cols-12 xl:gap-6">
            <div
              className="dash-reveal min-w-0 xl:col-span-5"
              style={{ animationDelay: "440ms" }}
            >
              <ExecutiveUpcomingTasks companyId={company.id} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
