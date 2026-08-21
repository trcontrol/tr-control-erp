"use server";

/**
 * Cash Flow — somente leitura (RPC dashboard).
 * Enforcement: plan entitlement ∩ can_view do módulo cash_flow.
 * Sem mutações nesta fase. Scope não aplicado.
 */
import { enrichCashFlowMovementsWithInstallments } from "@/lib/cash-flow/enrich-movements";
import { normalizeCashFlowDashboard } from "@/lib/cash-flow/normalize";
import { assertMemberPermission } from "@/lib/plans/require-module-access";
import { createClient } from "@/lib/supabase/server";
import { PERMISSION_MODULES } from "@/lib/users/permissions";
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

export async function getCashFlowDashboard(
  params: CashFlowDashboardParams
): Promise<Result<CashFlowDashboard>> {
  const authz = await assertMemberPermission({
    companyId: params.companyId,
    module: PERMISSION_MODULES.cashFlow,
    action: "view",
  });
  if (!authz.ok) {
    return { data: null, error: { message: authz.message } };
  }

  const supabase = await createClient();

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

  const normalized = normalizeCashFlowDashboard(data as CashFlowDashboard);
  const movements = await enrichCashFlowMovementsWithInstallments({
    supabase,
    companyId: params.companyId,
    movements: normalized.movements,
  });

  return {
    data: {
      ...normalized,
      movements,
    },
    error: null,
  };
}
