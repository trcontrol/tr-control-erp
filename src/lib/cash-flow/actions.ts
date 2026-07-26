import { createClient } from "@/lib/supabase/client";
import type { CashFlowDashboard } from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type CashFlowDashboardParams = {
  companyId: string;
  periodFrom: string;
  periodTo: string;
  mode: "realized" | "projected";
  direction?: string;
  status?: string;
  category?: string;
  paymentMethod?: string;
  origin?: string;
  grain?: "day" | "week" | "month";
};

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

export async function getCashFlowDashboard(
  params: CashFlowDashboardParams
): Promise<Result<CashFlowDashboard>> {
  const supabase = createClient();

  // Tipagem do supabase.rpc com Functions customizadas exige cast neste projeto.
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fnName: string,
        rpcParams?: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc("get_cash_flow_dashboard", {
    p_company_id: params.companyId,
    p_period_from: params.periodFrom,
    p_period_to: params.periodTo,
    p_mode: params.mode,
    p_direction:
      params.direction && params.direction !== "all"
        ? params.direction
        : null,
    p_status:
      params.status && params.status !== "all" ? params.status : null,
    p_category:
      params.category && params.category !== "all" ? params.category : null,
    p_payment_method:
      params.paymentMethod && params.paymentMethod !== "all"
        ? params.paymentMethod
        : null,
    p_origin:
      params.origin && params.origin !== "all" ? params.origin : null,
    p_grain: params.grain ?? "day",
  });

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  if (!data) {
    return {
      data: null,
      error: { message: "Não foi possível carregar o fluxo de caixa." },
    };
  }

  return {
    data: normalizeCashFlowDashboard(data as CashFlowDashboard),
    error: null,
  };
}
