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
import { ExecutiveCashFlowChart } from "@/components/dashboard/executive-cash-flow-chart";
import { ExecutiveFinancialDonut } from "@/components/dashboard/executive-financial-donut";
import { ExecutiveKpiGrid } from "@/components/dashboard/executive-kpi-grid";
import { ExecutiveLists } from "@/components/dashboard/executive-lists";
import { ExecutiveQuickActions } from "@/components/dashboard/executive-quick-actions";
import { ExecutiveRecentActivities } from "@/components/dashboard/executive-recent-activities";
import { ExecutiveSalesChart } from "@/components/dashboard/executive-sales-chart";
import { ExecutiveStockSummary } from "@/components/dashboard/executive-stock-summary";
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
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando dashboard executivo...
        </CardContent>
      </Card>
    );
  }

  if (error || !dashboard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Não foi possível carregar o dashboard</CardTitle>
          <CardDescription>
            {error ?? "Tente novamente em instantes."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {capabilities.shortcuts ? <ExecutiveQuickActions /> : null}

      <ExecutiveKpiGrid
        kpis={dashboard.kpis}
        cashFlowSeries={dashboard.cash_flow_series}
        salesSeries={dashboard.sales_series}
        showFinance={capabilities.finance}
        showSales={capabilities.sales}
        showPurchases={capabilities.purchases}
      />

      {capabilities.finance ? (
        <div className="grid min-w-0 gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-5">
            <DashboardSectionCard
              title="Resumo financeiro"
              description="Composição do mês e saldos em aberto"
            >
              <ExecutiveFinancialDonut kpis={dashboard.kpis} />
            </DashboardSectionCard>
          </div>
          <div className="min-w-0 xl:col-span-7">
            <DashboardSectionCard
              title="Entradas e saídas do mês"
              description="Movimentos realizados no mês corrente"
              contentClassName="min-w-0"
            >
              <ExecutiveCashFlowChart series={dashboard.cash_flow_series} />
            </DashboardSectionCard>
          </div>
        </div>
      ) : null}

      {(capabilities.sales || capabilities.stock) && (
        <div className="grid min-w-0 gap-4 xl:grid-cols-12">
          {capabilities.sales ? (
            <div
              className={
                capabilities.stock
                  ? "min-w-0 xl:col-span-7"
                  : "min-w-0 xl:col-span-12"
              }
            >
              <DashboardSectionCard
                title="Evolução das vendas"
                description="Totais mensais dos últimos 6 meses"
                contentClassName="min-w-0"
              >
                <ExecutiveSalesChart
                  series={dashboard.sales_series}
                  averageTicket={dashboard.kpis.average_ticket}
                />
              </DashboardSectionCard>
            </div>
          ) : null}

          {capabilities.stock ? (
            <div
              className={
                capabilities.sales
                  ? "min-w-0 xl:col-span-5"
                  : "min-w-0 xl:col-span-12"
              }
            >
              <ExecutiveStockSummary
                kpis={dashboard.kpis}
                lowStockProducts={dashboard.low_stock_products}
              />
            </div>
          ) : null}
        </div>
      )}

      {(capabilities.finance || capabilities.sales) && (
        <div
          className={
            capabilities.finance && capabilities.sales
              ? "grid min-w-0 gap-4 xl:grid-cols-2"
              : "grid min-w-0 gap-4"
          }
        >
          {capabilities.finance ? (
            <ExecutiveRecentActivities
              activities={dashboard.recent_financial_activities}
            />
          ) : null}

          {capabilities.sales ? (
            <DashboardSectionCard
              title="Últimas vendas"
              description="Confirmadas da empresa ativa"
              action={
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link href={ROUTES.sales}>Ver todas</Link>
                </Button>
              }
            >
              {!dashboard.recent_sales.length ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma venda confirmada ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {dashboard.recent_sales.map((sale) => (
                    <DashboardListRow
                      key={sale.id}
                      href={saleDetailPath(sale.id)}
                      title={sale.party_name}
                      meta={`${formatDateBR(sale.sale_date)}${
                        sale.document_number ? ` · ${sale.document_number}` : ""
                      }`}
                      amount={formatCurrency(toNumberAmount(sale.total_amount))}
                    />
                  ))}
                </div>
              )}
            </DashboardSectionCard>
          ) : null}
        </div>
      )}

      <ExecutiveLists
        data={dashboard}
        showFinance={capabilities.finance}
        showPurchases={capabilities.purchases}
      />
    </div>
  );
}
