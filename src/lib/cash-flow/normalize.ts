import type { CashFlowDashboard } from "@/types/database";

function toNumber(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function normalizeCashFlowDashboard(
  raw: CashFlowDashboard
): CashFlowDashboard {
  return {
    ...raw,
    kpis: {
      current_balance: toNumber(raw.kpis.current_balance),
      realized_inflows: toNumber(raw.kpis.realized_inflows),
      realized_outflows: toNumber(raw.kpis.realized_outflows),
      period_balance: toNumber(raw.kpis.period_balance),
      open_receivables: toNumber(raw.kpis.open_receivables),
      open_payables: toNumber(raw.kpis.open_payables),
      realized_opening_balance: toNumber(raw.kpis.realized_opening_balance),
      projected_opening_balance: toNumber(raw.kpis.projected_opening_balance),
    },
    series: (raw.series ?? []).map((point) => ({
      ...point,
      realized_inflows: toNumber(point.realized_inflows),
      realized_outflows: toNumber(point.realized_outflows),
      realized_net: toNumber(point.realized_net),
      projected_inflows: toNumber(point.projected_inflows),
      projected_outflows: toNumber(point.projected_outflows),
      projected_net: toNumber(point.projected_net),
      realized_balance: toNumber(point.realized_balance),
      projected_balance: toNumber(point.projected_balance),
    })),
    movements: (raw.movements ?? []).map((row) => ({
      ...row,
      inflow: toNumber(row.inflow),
      outflow: toNumber(row.outflow),
      running_balance: toNumber(row.running_balance),
    })),
  };
}
