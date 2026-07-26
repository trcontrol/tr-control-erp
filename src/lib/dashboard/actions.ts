import { createClient } from "@/lib/supabase/client";
import { toNumberAmount } from "@/lib/dashboard/format";
import type { ExecutiveDashboard } from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type ExecutiveDashboardParams = {
  companyId: string;
  periodFrom: string;
  periodTo: string;
};

function toCount(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(amount) ? Math.trunc(amount) : 0;
}

export function normalizeExecutiveDashboard(
  raw: ExecutiveDashboard
): ExecutiveDashboard {
  return {
    ...raw,
    kpis: {
      current_balance: toNumberAmount(raw.kpis.current_balance),
      month_inflows: toNumberAmount(raw.kpis.month_inflows),
      month_outflows: toNumberAmount(raw.kpis.month_outflows),
      month_result: toNumberAmount(raw.kpis.month_result),
      open_receivables: toNumberAmount(raw.kpis.open_receivables),
      open_payables: toNumberAmount(raw.kpis.open_payables),
      overdue_total: toNumberAmount(raw.kpis.overdue_total),
      overdue_receivables: toNumberAmount(raw.kpis.overdue_receivables),
      overdue_payables: toNumberAmount(raw.kpis.overdue_payables),
      confirmed_sales_total: toNumberAmount(raw.kpis.confirmed_sales_total),
      confirmed_sales_count: toCount(raw.kpis.confirmed_sales_count),
      confirmed_purchases_total: toNumberAmount(
        raw.kpis.confirmed_purchases_total
      ),
      confirmed_purchases_count: toCount(raw.kpis.confirmed_purchases_count),
      average_ticket: toNumberAmount(raw.kpis.average_ticket),
      stock_value: toNumberAmount(raw.kpis.stock_value),
      low_stock_count: toCount(raw.kpis.low_stock_count),
    },
    cash_flow_series: (raw.cash_flow_series ?? []).map((point) => ({
      ...point,
      inflows: toNumberAmount(point.inflows),
      outflows: toNumberAmount(point.outflows),
    })),
    sales_series: (raw.sales_series ?? []).map((point) => ({
      ...point,
      total: toNumberAmount(point.total),
      count: toCount(point.count),
    })),
    recent_sales: (raw.recent_sales ?? []).map((row) => ({
      ...row,
      total_amount: toNumberAmount(row.total_amount),
    })),
    recent_purchases: (raw.recent_purchases ?? []).map((row) => ({
      ...row,
      total_amount: toNumberAmount(row.total_amount),
    })),
    upcoming_payables: (raw.upcoming_payables ?? []).map((row) => ({
      ...row,
      amount: toNumberAmount(row.amount),
    })),
    upcoming_receivables: (raw.upcoming_receivables ?? []).map((row) => ({
      ...row,
      amount: toNumberAmount(row.amount),
    })),
    low_stock_products: (raw.low_stock_products ?? []).map((row) => ({
      ...row,
      current_stock: toNumberAmount(row.current_stock),
      min_stock: toNumberAmount(row.min_stock),
    })),
  };
}

export async function getExecutiveDashboard(
  params: ExecutiveDashboardParams
): Promise<Result<ExecutiveDashboard>> {
  const supabase = createClient();

  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fnName: string,
        rpcParams?: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc("get_executive_dashboard", {
    p_company_id: params.companyId,
    p_period_from: params.periodFrom,
    p_period_to: params.periodTo,
  });

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  if (!data) {
    return {
      data: null,
      error: { message: "Não foi possível carregar o dashboard executivo." },
    };
  }

  return {
    data: normalizeExecutiveDashboard(data as ExecutiveDashboard),
    error: null,
  };
}
