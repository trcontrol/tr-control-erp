"use client";

import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  ShoppingBag,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import {
  DashboardKpiCard,
  type KpiAccent,
} from "@/components/dashboard/dashboard-kpi-card";
import { formatCurrency, toNumberAmount } from "@/lib/dashboard/format";
import type { ExecutiveDashboard } from "@/types/database";

type ExecutiveKpiGridProps = {
  kpis: ExecutiveDashboard["kpis"];
  cashFlowSeries: ExecutiveDashboard["cash_flow_series"];
  salesSeries: ExecutiveDashboard["sales_series"];
  showFinance?: boolean;
  showSales?: boolean;
  showPurchases?: boolean;
};

function buildCashSeries(
  series: ExecutiveDashboard["cash_flow_series"],
  pick: "inflows" | "outflows" | "result" | "running"
) {
  if (pick === "running") {
    let running = 0;
    return series.map((point) => {
      running +=
        toNumberAmount(point.inflows) - toNumberAmount(point.outflows);
      return running;
    });
  }

  return series.map((point) => {
    const inflows = toNumberAmount(point.inflows);
    const outflows = toNumberAmount(point.outflows);
    if (pick === "inflows") return inflows;
    if (pick === "outflows") return outflows;
    return inflows - outflows;
  });
}

function trendFromSeries(values: number[]): number | null {
  if (values.length < 2) return null;
  const midpoint = Math.floor(values.length / 2);
  const earlier = values.slice(0, midpoint);
  const later = values.slice(midpoint);
  const avg = (items: number[]) =>
    items.reduce((sum, value) => sum + value, 0) / (items.length || 1);
  const base = avg(earlier);
  const current = avg(later);
  if (Math.abs(base) < 0.0001) {
    if (Math.abs(current) < 0.0001) return 0;
    return current > 0 ? 100 : -100;
  }
  return ((current - base) / Math.abs(base)) * 100;
}

export function ExecutiveKpiGrid({
  kpis,
  cashFlowSeries,
  salesSeries,
  showFinance = true,
  showSales = true,
  showPurchases = true,
}: ExecutiveKpiGridProps) {
  const sparklines = useMemo(() => {
    const balance = buildCashSeries(cashFlowSeries, "running");
    const inflows = buildCashSeries(cashFlowSeries, "inflows");
    const outflows = buildCashSeries(cashFlowSeries, "outflows");
    const result = buildCashSeries(cashFlowSeries, "result");
    const sales = salesSeries.map((point) => toNumberAmount(point.total));

    return { balance, inflows, outflows, result, sales };
  }, [cashFlowSeries, salesSeries]);

  const monthResult = toNumberAmount(kpis.month_result);
  const cards = [
    showFinance
      ? {
          key: "balance",
          title: "Saldo atual",
          value: formatCurrency(toNumberAmount(kpis.current_balance)),
          hint: "Até hoje",
          icon: Wallet,
          sparklineValues: sparklines.balance,
          accent: "navy" as KpiAccent,
        }
      : null,
    showFinance
      ? {
          key: "inflows",
          title: "Entradas",
          value: formatCurrency(toNumberAmount(kpis.month_inflows)),
          hint: "Este mês",
          icon: ArrowUpRight,
          sparklineValues: sparklines.inflows,
          accent: "emerald" as KpiAccent,
        }
      : null,
    showFinance
      ? {
          key: "outflows",
          title: "Saídas",
          value: formatCurrency(toNumberAmount(kpis.month_outflows)),
          hint: "Este mês",
          icon: ArrowDownRight,
          sparklineValues: sparklines.outflows,
          accent: "coral" as KpiAccent,
        }
      : null,
    showFinance
      ? {
          key: "result",
          title: "Resultado",
          value: formatCurrency(monthResult),
          hint: "Este mês",
          icon: Scale,
          sparklineValues: sparklines.result,
          accent: "gold" as KpiAccent,
        }
      : null,
    showSales
      ? {
          key: "sales",
          title: "Vendas",
          value: formatCurrency(toNumberAmount(kpis.confirmed_sales_total)),
          hint: `${toNumberAmount(kpis.confirmed_sales_count)} confirmada(s)`,
          icon: ShoppingBag,
          sparklineValues: sparklines.sales,
          accent: "teal" as KpiAccent,
        }
      : null,
    showPurchases
      ? {
          key: "purchases",
          title: "Compras",
          value: formatCurrency(toNumberAmount(kpis.confirmed_purchases_total)),
          hint: `${toNumberAmount(kpis.confirmed_purchases_count)} confirmada(s)`,
          icon: ShoppingCart,
          sparklineValues: [],
          accent: "sky" as KpiAccent,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    title: string;
    value: string;
    hint: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    sparklineValues: number[];
    accent: KpiAccent;
  }>;

  if (!cards.length) return null;

  const columns =
    cards.length <= 3
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
      : cards.length === 4
        ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={`grid gap-4 sm:gap-[18px] ${columns}`}>
      {cards.map((card, index) => (
        <DashboardKpiCard
          key={card.key}
          className="dash-reveal"
          style={{ animationDelay: `${index * 55}ms` }}
          title={card.title}
          value={card.value}
          hint={card.hint}
          icon={card.icon}
          sparklineValues={card.sparklineValues}
          accent={card.accent}
          trendPercent={trendFromSeries(card.sparklineValues)}
        />
      ))}
    </div>
  );
}
