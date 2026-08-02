import { createClient } from "@/lib/supabase/client";
import {
  OPPORTUNITY_FUNNEL_STAGE_OPTIONS,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_STATUS,
} from "@/lib/constants";
import { toNumberAmount } from "@/lib/dashboard/format";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type FunnelStageSummaryRow = {
  stage: string;
  label: string;
  count: number;
  totalValue: number;
  percent: number;
};

export type FunnelDashboardSummary = {
  /** Apenas as 8 etapas principais (sem Perdido). */
  stages: FunnelStageSummaryRow[];
  /** Todas as oportunidades ativas consideradas (inclui Perdido no denominador). */
  totalCount: number;
  openValue: number;
  /** Quantidade em Contrato fechado (numerador da conversão). */
  closedCount: number;
  conversionRate: number;
};

type OpportunitySummaryRow = {
  stage: string;
  estimated_value: number | string | null;
  status: string;
};

const OPEN_PIPELINE_STAGES = new Set<string>([
  OPPORTUNITY_STAGES.new_lead,
  OPPORTUNITY_STAGES.contact_made,
  OPPORTUNITY_STAGES.briefing_sent,
  OPPORTUNITY_STAGES.proposal_sent,
  OPPORTUNITY_STAGES.negotiation,
]);

/**
 * Resumo executivo do funil para a empresa ativa.
 * Consulta apenas oportunidades reais (RLS + company_id).
 *
 * Conversão = Contrato fechado ÷ total de ativas (inclui Perdido) × 100.
 * Perdido não aparece na sequência numerada do Dashboard.
 */
export async function getFunnelDashboardSummary(
  companyId: string
): Promise<Result<FunnelDashboardSummary>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select("stage, estimated_value, status")
    .eq("company_id", companyId)
    .eq("status", OPPORTUNITY_STATUS.active);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  const rows = (data ?? []) as OpportunitySummaryRow[];
  const totalCount = rows.length;

  const byStage = new Map<
    string,
    { count: number; totalValue: number }
  >();

  for (const option of OPPORTUNITY_FUNNEL_STAGE_OPTIONS) {
    byStage.set(option.value, { count: 0, totalValue: 0 });
  }

  let openValue = 0;
  let closedCount = 0;

  for (const row of rows) {
    const amount = toNumberAmount(row.estimated_value ?? 0);
    const bucket = byStage.get(row.stage);
    if (bucket) {
      bucket.count += 1;
      bucket.totalValue += amount;
      byStage.set(row.stage, bucket);
    }

    if (row.stage === OPPORTUNITY_STAGES.contract_closed) {
      closedCount += 1;
    }

    if (OPEN_PIPELINE_STAGES.has(row.stage)) {
      openValue += amount;
    }
  }

  const stages: FunnelStageSummaryRow[] = OPPORTUNITY_FUNNEL_STAGE_OPTIONS.map(
    (option) => {
      const bucket = byStage.get(option.value) ?? {
        count: 0,
        totalValue: 0,
      };
      const percent =
        totalCount > 0
          ? Math.round((bucket.count / totalCount) * 100)
          : 0;

      return {
        stage: option.value,
        label: option.label,
        count: bucket.count,
        totalValue: bucket.totalValue,
        percent,
      };
    }
  );

  const conversionRate =
    totalCount > 0 ? (closedCount / totalCount) * 100 : 0;

  return {
    data: {
      stages,
      totalCount,
      openValue,
      closedCount,
      conversionRate,
    },
    error: null,
  };
}
