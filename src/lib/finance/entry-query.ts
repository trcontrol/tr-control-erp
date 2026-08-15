import { getFinancialEntryDeleteBlockReason } from "@/lib/finance/delete-guard";
import { resolveEntryStatus } from "@/lib/finance/format";
import type {
  FinancialEntry,
  FinancialEntryInsert,
  FinancialEntryUpdate,
} from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type FinancialEntryWithRelations = FinancialEntry & {
  customer?: { id: string; full_name: string } | null;
  supplier?: { id: string; full_name: string } | null;
};

/** @deprecated use FinancialEntryWithRelations */
export type FinancialEntryWithCustomer = FinancialEntryWithRelations;

export const FINANCE_ENTRY_SELECT = `
  *,
  customer:customers (
    id,
    full_name
  ),
  supplier:suppliers (
    id,
    full_name
  )
`;

/** Cliente Supabase mínimo usado pelas queries (browser ou server). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any };

export async function queryFinancialEntries(
  supabase: SupabaseLike,
  params: {
    companyId: string;
    entryType?: string;
    status?: string;
    search?: string;
    periodFrom?: string;
    periodTo?: string;
  }
): Promise<Result<FinancialEntryWithRelations[]>> {
  let query = supabase
    .from("financial_entries")
    .select(FINANCE_ENTRY_SELECT)
    .eq("company_id", params.companyId)
    .order("due_date", { ascending: true });

  if (params.entryType && params.entryType !== "all") {
    query = query.eq("entry_type", params.entryType);
  }

  if (params.periodFrom) {
    query = query.gte("due_date", params.periodFrom);
  }

  if (params.periodTo) {
    query = query.lte("due_date", params.periodTo);
  }

  if (params.search?.trim()) {
    const term = params.search.trim();
    query = query.or(
      `description.ilike.%${term}%,category.ilike.%${term}%,party_name.ilike.%${term}%,document_number.ilike.%${term}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  let entries = (data ?? []) as FinancialEntryWithRelations[];

  entries = entries.map((entry) => ({
    ...entry,
    status: resolveEntryStatus(entry.status, entry.due_date, entry.entry_type),
  }));

  if (params.status && params.status !== "all") {
    entries = entries.filter((entry) => entry.status === params.status);
  }

  return { data: entries, error: null };
}

export async function queryFinancialEntry(
  supabase: SupabaseLike,
  companyId: string,
  entryId: string
): Promise<Result<FinancialEntryWithRelations>> {
  const { data, error } = await supabase
    .from("financial_entries")
    .select(FINANCE_ENTRY_SELECT)
    .eq("company_id", companyId)
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  if (!data) {
    return { data: null, error: { message: "Lançamento não encontrado." } };
  }

  const entry = data as FinancialEntryWithRelations;

  return {
    data: {
      ...entry,
      status: resolveEntryStatus(entry.status, entry.due_date, entry.entry_type),
    },
    error: null,
  };
}

export async function insertFinancialEntry(
  supabase: SupabaseLike,
  payload: FinancialEntryInsert
): Promise<Result<FinancialEntry>> {
  const { data, error } = await supabase
    .from("financial_entries")
    .insert({
      ...payload,
      source_type: payload.source_type || "manual",
    } as never)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as FinancialEntry, error: null };
}

export async function patchFinancialEntry(
  supabase: SupabaseLike,
  companyId: string,
  entryId: string,
  payload: FinancialEntryUpdate
): Promise<Result<FinancialEntry>> {
  const { data, error } = await supabase
    .from("financial_entries")
    .update(payload as never)
    .eq("company_id", companyId)
    .eq("id", entryId)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as FinancialEntry, error: null };
}

export async function removeFinancialEntry(
  supabase: SupabaseLike,
  companyId: string,
  entryId: string
): Promise<Result<true>> {
  const { data: existing, error: loadError } = await supabase
    .from("financial_entries")
    .select("id, status, source_type")
    .eq("company_id", companyId)
    .eq("id", entryId)
    .maybeSingle();

  if (loadError) {
    return { data: null, error: { message: loadError.message } };
  }

  if (!existing) {
    return { data: null, error: { message: "Lançamento não encontrado." } };
  }

  const blockReason = getFinancialEntryDeleteBlockReason(
    existing as { status: string | null; source_type: string | null }
  );
  if (blockReason) {
    return { data: null, error: { message: blockReason } };
  }

  const { error } = await supabase
    .from("financial_entries")
    .delete()
    .eq("company_id", companyId)
    .eq("id", entryId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: true, error: null };
}
