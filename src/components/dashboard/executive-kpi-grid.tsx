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
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
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
          hint: "Pagos e recebidos até hoje",
          icon: Wallet,
          sparklineValues: sparklines.balance,
          tone:
            toNumberAmount(kpis.current_balance) >= 0
              ? ("positive" as const)
              : ("negative" as const),
        }
      : null,
    showFinance
      ? {
          key: "inflows",
          title: "Entradas do mês",
          value: formatCurrency(toNumberAmount(kpis.month_inflows)),
          hint: "Realizadas no mês corrente",
          icon: ArrowUpRight,
          sparklineValues: sparklines.inflows,
          tone: "positive" as const,
        }
      : null,
    showFinance
      ? {
          key: "outflows",
          title: "Saídas do mês",
          value: formatCurrency(toNumberAmount(kpis.month_outflows)),
          hint: "Realizadas no mês corrente",
          icon: ArrowDownRight,
          sparklineValues: sparklines.outflows,
          tone: "negative" as const,
        }
      : null,
    showFinance
      ? {
          key: "result",
          title: "Resultado do mês",
          value: formatCurrency(monthResult),
          hint: "Entradas − saídas realizadas",
          icon: Scale,
          sparklineValues: sparklines.result,
          tone: monthResult >= 0 ? ("positive" as const) : ("negative" as const),
        }
      : null,
    showSales
      ? {
          key: "sales",
          title: "Vendas do mês",
          value: formatCurrency(toNumberAmount(kpis.confirmed_sales_total)),
          hint: `${toNumberAmount(kpis.confirmed_sales_count)} venda(s) confirmada(s)`,
          icon: ShoppingBag,
          sparklineValues: sparklines.sales,
          tone: "default" as const,
        }
      : null,
    showPurchases
      ? {
          key: "purchases",
          title: "Compras do mês",
          value: formatCurrency(toNumberAmount(kpis.confirmed_purchases_total)),
          hint: `${toNumberAmount(kpis.confirmed_purchases_count)} compra(s) confirmada(s)`,
          icon: ShoppingCart,
          sparklineValues: [],
          tone: "default" as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    title: string;
    value: string;
    hint: string;
    icon: React.ComponentType<{ className?: string }>;
    sparklineValues: number[];
    tone: "default" | "positive" | "negative";
  }>;

  if (!cards.length) return null;

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <DashboardKpiCard
          key={card.key}
          title={card.title}
          value={card.value}
          hint={card.hint}
          icon={card.icon}
          sparklineValues={card.sparklineValues}
          tone={card.tone}
        />
      ))}
    </div>
  );
}
