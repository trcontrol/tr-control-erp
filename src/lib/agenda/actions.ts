import { createClient } from "@/lib/supabase/client";
import {
  AGENDA_STATUS,
  AGENDA_STATUS_OPTIONS,
  type AgendaStatusValue,
} from "@/lib/constants";
import {
  compareAgendaEventsByStart,
  normalizeAgendaTime,
} from "@/lib/agenda/format";
import type {
  AgendaEvent,
  AgendaEventInsert,
  AgendaEventUpdate,
  Customer,
  Profile,
} from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

const AGENDA_STATUS_VALUES = new Set<string>(
  AGENDA_STATUS_OPTIONS.map((option) => option.value)
);

function normalizeAgendaStatusValue(status: string): AgendaStatusValue | null {
  if (status === "cancelled") return AGENDA_STATUS.canceled;
  if (AGENDA_STATUS_VALUES.has(status)) {
    return status as AgendaStatusValue;
  }
  return null;
}

export type AgendaEventWithRelations = AgendaEvent & {
  assigned_user: Pick<Profile, "id" | "full_name"> | null;
  related_customer: Pick<Customer, "id" | "full_name" | "trade_name"> | null;
  created_by_user: Pick<Profile, "id" | "full_name"> | null;
};

const AGENDA_SELECT = `
  *,
  assigned_user:profiles!agenda_events_assigned_user_id_fkey (
    id,
    full_name
  ),
  related_customer:customers!agenda_events_related_customer_id_fkey (
    id,
    full_name,
    trade_name
  ),
  created_by_user:profiles!agenda_events_created_by_fkey (
    id,
    full_name
  )
`;

function mapAgendaError(message: string) {
  if (message.includes("agenda_events_status_check")) {
    return "Status inválido no banco. Execute a migration 023_expand_agenda_statuses no Supabase para permitir os novos status.";
  }
  if (message.includes("agenda_events_date_range_check")) {
    return "A data final deve ser igual ou posterior à data inicial.";
  }
  return message;
}

export async function listAgendaEvents(params: {
  companyId: string;
  search?: string;
  status?: string;
  periodFrom?: string;
  periodTo?: string;
  assignedUserId?: string;
  relatedCustomerId?: string;
}): Promise<Result<AgendaEventWithRelations[]>> {
  const supabase = createClient();
  let query = supabase
    .from("agenda_events")
    .select(AGENDA_SELECT)
    .eq("company_id", params.companyId)
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.periodFrom) {
    query = query.gte("start_date", params.periodFrom);
  }

  if (params.periodTo) {
    query = query.lte("start_date", params.periodTo);
  }

  if (params.assignedUserId && params.assignedUserId !== "all") {
    query = query.eq("assigned_user_id", params.assignedUserId);
  }

  if (params.relatedCustomerId && params.relatedCustomerId !== "all") {
    query = query.eq("related_customer_id", params.relatedCustomerId);
  }

  if (params.search?.trim()) {
    const term = params.search.trim();
    query = query.or(
      `title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: { message: mapAgendaError(error.message) } };
  }

  const events = (data ?? []) as AgendaEventWithRelations[];
  events.sort(compareAgendaEventsByStart);

  return { data: events, error: null };
}

export async function getAgendaEvent(
  companyId: string,
  eventId: string
): Promise<Result<AgendaEventWithRelations>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agenda_events")
    .select(AGENDA_SELECT)
    .eq("company_id", companyId)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: mapAgendaError(error.message) } };
  }

  if (!data) {
    return { data: null, error: { message: "Compromisso não encontrado." } };
  }

  return { data: data as AgendaEventWithRelations, error: null };
}

export async function createAgendaEvent(params: {
  companyId: string;
  title: string;
  description?: string | null;
  startDate: string;
  startTime?: string | null;
  endDate: string;
  endTime?: string | null;
  allDay?: boolean;
  status?: string;
  location?: string | null;
  assignedUserId?: string | null;
  relatedCustomerId?: string | null;
}): Promise<Result<AgendaEventWithRelations>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: { message: "Usuário não autenticado." } };
  }

  const allDay = Boolean(params.allDay);
  const payload: AgendaEventInsert = {
    company_id: params.companyId,
    title: params.title.trim(),
    description: params.description?.trim() || null,
    start_date: params.startDate,
    start_time: allDay ? null : normalizeAgendaTime(params.startTime),
    end_date: params.endDate,
    end_time: allDay ? null : normalizeAgendaTime(params.endTime),
    all_day: allDay,
    status: params.status ?? AGENDA_STATUS.scheduled,
    location: params.location?.trim() || null,
    assigned_user_id: params.assignedUserId || null,
    related_customer_id: params.relatedCustomerId || null,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("agenda_events")
    .insert(payload as never)
    .select(AGENDA_SELECT)
    .single();

  if (error) {
    return { data: null, error: { message: mapAgendaError(error.message) } };
  }

  return { data: data as AgendaEventWithRelations, error: null };
}

export async function updateAgendaEvent(
  companyId: string,
  eventId: string,
  params: {
    title: string;
    description?: string | null;
    startDate: string;
    startTime?: string | null;
    endDate: string;
    endTime?: string | null;
    allDay?: boolean;
    status: string;
    location?: string | null;
    assignedUserId?: string | null;
    relatedCustomerId?: string | null;
  }
): Promise<Result<AgendaEventWithRelations>> {
  const supabase = createClient();
  const allDay = Boolean(params.allDay);

  const payload: AgendaEventUpdate = {
    title: params.title.trim(),
    description: params.description?.trim() || null,
    start_date: params.startDate,
    start_time: allDay ? null : normalizeAgendaTime(params.startTime),
    end_date: params.endDate,
    end_time: allDay ? null : normalizeAgendaTime(params.endTime),
    all_day: allDay,
    status: params.status,
    location: params.location?.trim() || null,
    assigned_user_id: params.assignedUserId || null,
    related_customer_id: params.relatedCustomerId || null,
  };

  const { data, error } = await supabase
    .from("agenda_events")
    .update(payload as never)
    .eq("company_id", companyId)
    .eq("id", eventId)
    .select(AGENDA_SELECT)
    .single();

  if (error) {
    return { data: null, error: { message: mapAgendaError(error.message) } };
  }

  return { data: data as AgendaEventWithRelations, error: null };
}

export async function updateAgendaEventStatus(
  companyId: string,
  eventId: string,
  status: string
): Promise<Result<AgendaEventWithRelations>> {
  const normalized = normalizeAgendaStatusValue(status);

  if (!normalized) {
    return {
      data: null,
      error: {
        message:
          "Status inválido. Use apenas: Agendado, Confirmado, Em andamento, Concluído, Cancelado ou Reagendado.",
      },
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("agenda_events")
    .update({ status: normalized } as never)
    .eq("company_id", companyId)
    .eq("id", eventId)
    .select(AGENDA_SELECT)
    .single();

  if (error) {
    return { data: null, error: { message: mapAgendaError(error.message) } };
  }

  return { data: data as AgendaEventWithRelations, error: null };
}

export async function completeAgendaEvent(
  companyId: string,
  eventId: string
): Promise<Result<AgendaEventWithRelations>> {
  return updateAgendaEventStatus(
    companyId,
    eventId,
    AGENDA_STATUS.completed
  );
}

export async function reopenAgendaEvent(
  companyId: string,
  eventId: string
): Promise<Result<AgendaEventWithRelations>> {
  return updateAgendaEventStatus(
    companyId,
    eventId,
    AGENDA_STATUS.scheduled
  );
}

export async function cancelAgendaEvent(
  companyId: string,
  eventId: string
): Promise<Result<AgendaEventWithRelations>> {
  return updateAgendaEventStatus(
    companyId,
    eventId,
    AGENDA_STATUS.canceled
  );
}

export async function deleteAgendaEvent(
  companyId: string,
  eventId: string
): Promise<Result<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("agenda_events")
    .delete()
    .eq("company_id", companyId)
    .eq("id", eventId);

  if (error) {
    return { data: null, error: { message: mapAgendaError(error.message) } };
  }

  return { data: true, error: null };
}
