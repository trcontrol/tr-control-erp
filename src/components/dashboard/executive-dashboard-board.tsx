"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { currentMonthPeriod } from "@/lib/dashboard/format";
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
    <div className="space-y-6">
      {capabilities.shortcuts ? <ExecutiveQuickActions /> : null}

      <ExecutiveKpiGrid
        kpis={dashboard.kpis}
        showFinance={capabilities.finance}
        showSales={capabilities.sales}
        showPurchases={capabilities.purchases}
      />

      {(capabilities.finance || capabilities.sales) && (
        <div className="grid gap-6 xl:grid-cols-3">
          {capabilities.finance ? (
            <Card className="border-[var(--brand-navy)]/10 shadow-sm">
              <CardHeader>
                <CardTitle>Composição financeira</CardTitle>
                <CardDescription>
                  Entradas versus saídas realizadas no mês
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExecutiveFinancialDonut kpis={dashboard.kpis} />
              </CardContent>
            </Card>
          ) : null}

          {capabilities.finance ? (
            <Card className="border-[var(--brand-navy)]/10 shadow-sm xl:col-span-1">
              <CardHeader>
                <CardTitle>Entradas e saídas do mês</CardTitle>
                <CardDescription>
                  Movimentos realizados no mês corrente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExecutiveCashFlowChart series={dashboard.cash_flow_series} />
              </CardContent>
            </Card>
          ) : null}

          {capabilities.sales ? (
            <Card className="border-[var(--brand-navy)]/10 shadow-sm">
              <CardHeader>
                <CardTitle>Evolução das vendas</CardTitle>
                <CardDescription>
                  Totais mensais dos últimos 6 meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExecutiveSalesChart series={dashboard.sales_series} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {(capabilities.finance || capabilities.stock) && (
        <div className="grid gap-6 xl:grid-cols-2">
          {capabilities.finance ? (
            <ExecutiveRecentActivities
              activities={dashboard.recent_financial_activities}
            />
          ) : null}
          {capabilities.stock ? (
            <ExecutiveStockSummary kpis={dashboard.kpis} />
          ) : null}
        </div>
      )}

      <ExecutiveLists
        data={dashboard}
        showFinance={capabilities.finance}
        showSales={capabilities.sales}
        showPurchases={capabilities.purchases}
        showStock={capabilities.stock}
      />
    </div>
  );
}
