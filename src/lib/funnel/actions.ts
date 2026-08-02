import { createClient } from "@/lib/supabase/client";
import {
  OPPORTUNITY_STAGE_OPTIONS,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_STATUS,
} from "@/lib/constants";
import { toOpportunityAmount } from "@/lib/funnel/format";
import type {
  Customer,
  Opportunity,
  OpportunityInsert,
  OpportunityUpdate,
  Profile,
} from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type OpportunityWithRelations = Opportunity & {
  customer: Pick<Customer, "id" | "full_name" | "trade_name"> | null;
  assigned_user: Pick<Profile, "id" | "full_name"> | null;
  created_by_user: Pick<Profile, "id" | "full_name"> | null;
};

export type OpportunityStageSummary = {
  stage: string;
  count: number;
  totalValue: number;
};

const OPPORTUNITY_SELECT = `
  *,
  customer:customers!opportunities_customer_id_fkey (
    id,
    full_name,
    trade_name
  ),
  assigned_user:profiles!opportunities_assigned_user_id_fkey (
    id,
    full_name
  ),
  created_by_user:profiles!opportunities_created_by_fkey (
    id,
    full_name
  )
`;

function mapOpportunityError(message: string) {
  if (message.includes("opportunities_stage_check")) {
    return "Etapa inválida.";
  }
  if (message.includes("opportunities_status_check")) {
    return "Status inválido.";
  }
  if (message.includes("opportunities_customer_id_fkey")) {
    return "Cliente inválido ou indisponível.";
  }
  return message;
}

export async function listOpportunities(params: {
  companyId: string;
  search?: string;
  stage?: string;
  assignedUserId?: string;
  status?: string;
  periodFrom?: string;
  periodTo?: string;
}): Promise<Result<OpportunityWithRelations[]>> {
  const supabase = createClient();
  let query = supabase
    .from("opportunities")
    .select(OPPORTUNITY_SELECT)
    .eq("company_id", params.companyId)
    .order("next_action_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (params.stage && params.stage !== "all") {
    query = query.eq("stage", params.stage);
  }

  if (params.assignedUserId && params.assignedUserId !== "all") {
    query = query.eq("assigned_user_id", params.assignedUserId);
  }

  if (params.status === "all") {
    // sem filtro de status
  } else if (params.status) {
    query = query.eq("status", params.status);
  } else {
    query = query.eq("status", OPPORTUNITY_STATUS.active);
  }

  if (params.periodFrom) {
    query = query.gte("next_action_date", params.periodFrom);
  }

  if (params.periodTo) {
    query = query.lte("next_action_date", params.periodTo);
  }

  if (params.search?.trim()) {
    const term = params.search.trim();
    query = query.or(`title.ilike.%${term}%,notes.ilike.%${term}%`);
  }

  const { data, error } = await query;

  if (error) {
    return {
      data: null,
      error: { message: mapOpportunityError(error.message) },
    };
  }

  return { data: (data ?? []) as OpportunityWithRelations[], error: null };
}

export function summarizeOpportunitiesByStage(
  opportunities: OpportunityWithRelations[]
): OpportunityStageSummary[] {
  const map = new Map<string, OpportunityStageSummary>();

  for (const option of OPPORTUNITY_STAGE_OPTIONS) {
    map.set(option.value, {
      stage: option.value,
      count: 0,
      totalValue: 0,
    });
  }

  for (const opportunity of opportunities) {
    const current = map.get(opportunity.stage) ?? {
      stage: opportunity.stage,
      count: 0,
      totalValue: 0,
    };
    current.count += 1;
    current.totalValue += toOpportunityAmount(opportunity.estimated_value);
    map.set(opportunity.stage, current);
  }

  return Array.from(map.values());
}

export async function getOpportunity(
  companyId: string,
  opportunityId: string
): Promise<Result<OpportunityWithRelations>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select(OPPORTUNITY_SELECT)
    .eq("company_id", companyId)
    .eq("id", opportunityId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: { message: mapOpportunityError(error.message) },
    };
  }

  if (!data) {
    return { data: null, error: { message: "Oportunidade não encontrada." } };
  }

  return { data: data as OpportunityWithRelations, error: null };
}

export async function createOpportunity(params: {
  companyId: string;
  customerId: string;
  title: string;
  estimatedValue?: number;
  stage?: string;
  assignedUserId?: string | null;
  nextActionDate?: string | null;
  notes?: string | null;
  status?: string;
}): Promise<Result<OpportunityWithRelations>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: { message: "Usuário não autenticado." } };
  }

  const payload: OpportunityInsert = {
    company_id: params.companyId,
    customer_id: params.customerId,
    title: params.title.trim(),
    estimated_value: params.estimatedValue ?? 0,
    stage: params.stage ?? OPPORTUNITY_STAGES.new_lead,
    assigned_user_id: params.assignedUserId || null,
    next_action_date: params.nextActionDate || null,
    notes: params.notes?.trim() || null,
    status: params.status ?? OPPORTUNITY_STATUS.active,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("opportunities")
    .insert(payload as never)
    .select(OPPORTUNITY_SELECT)
    .single();

  if (error) {
    return {
      data: null,
      error: { message: mapOpportunityError(error.message) },
    };
  }

  return { data: data as OpportunityWithRelations, error: null };
}

export async function updateOpportunity(
  companyId: string,
  opportunityId: string,
  params: {
    customerId: string;
    title: string;
    estimatedValue: number;
    stage: string;
    assignedUserId?: string | null;
    nextActionDate?: string | null;
    notes?: string | null;
    status: string;
  }
): Promise<Result<OpportunityWithRelations>> {
  const supabase = createClient();

  const payload: OpportunityUpdate = {
    customer_id: params.customerId,
    title: params.title.trim(),
    estimated_value: params.estimatedValue,
    stage: params.stage,
    assigned_user_id: params.assignedUserId || null,
    next_action_date: params.nextActionDate || null,
    notes: params.notes?.trim() || null,
    status: params.status,
  };

  const { data, error } = await supabase
    .from("opportunities")
    .update(payload as never)
    .eq("company_id", companyId)
    .eq("id", opportunityId)
    .select(OPPORTUNITY_SELECT)
    .single();

  if (error) {
    return {
      data: null,
      error: { message: mapOpportunityError(error.message) },
    };
  }

  return { data: data as OpportunityWithRelations, error: null };
}

export async function updateOpportunityStage(
  companyId: string,
  opportunityId: string,
  stage: string
): Promise<Result<OpportunityWithRelations>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .update({ stage } as never)
    .eq("company_id", companyId)
    .eq("id", opportunityId)
    .select(OPPORTUNITY_SELECT)
    .single();

  if (error) {
    return {
      data: null,
      error: { message: mapOpportunityError(error.message) },
    };
  }

  return { data: data as OpportunityWithRelations, error: null };
}

export async function deleteOpportunity(
  companyId: string,
  opportunityId: string
): Promise<Result<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("opportunities")
    .delete()
    .eq("company_id", companyId)
    .eq("id", opportunityId);

  if (error) {
    return {
      data: null,
      error: { message: mapOpportunityError(error.message) },
    };
  }

  return { data: true, error: null };
}
