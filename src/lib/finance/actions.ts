import { createClient } from "@/lib/supabase/client";
import { FINANCIAL_STATUS } from "@/lib/constants";
import { resolveEntryStatus, todayISODate } from "@/lib/finance/format";
import type {
  FinancialEntry,
  FinancialEntryInsert,
  FinancialEntryUpdate,
} from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type FinancialEntryWithCustomer = FinancialEntry & {
  customer?: { id: string; full_name: string } | null;
};

export async function listFinancialEntries(params: {
  companyId: string;
  entryType?: string;
  status?: string;
  search?: string;
  periodFrom?: string;
  periodTo?: string;
}): Promise<Result<FinancialEntryWithCustomer[]>> {
  const supabase = createClient();

  let query = supabase
    .from("financial_entries")
    .select(
      `
      *,
      customer:customers (
        id,
        full_name
      )
    `
    )
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

  let entries = (data ?? []) as FinancialEntryWithCustomer[];

  entries = entries.map((entry) => ({
    ...entry,
    status: resolveEntryStatus(entry.status, entry.due_date, entry.entry_type),
  }));

  if (params.status && params.status !== "all") {
    entries = entries.filter((entry) => entry.status === params.status);
  }

  return { data: entries, error: null };
}

export async function getFinancialEntry(
  companyId: string,
  entryId: string
): Promise<Result<FinancialEntryWithCustomer>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_entries")
    .select(
      `
      *,
      customer:customers (
        id,
        full_name
      )
    `
    )
    .eq("company_id", companyId)
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  if (!data) {
    return { data: null, error: { message: "Lançamento não encontrado." } };
  }

  const entry = data as FinancialEntryWithCustomer;

  return {
    data: {
      ...entry,
      status: resolveEntryStatus(entry.status, entry.due_date, entry.entry_type),
    },
    error: null,
  };
}

export async function createFinancialEntry(
  payload: FinancialEntryInsert
): Promise<Result<FinancialEntry>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_entries")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as FinancialEntry, error: null };
}

export async function updateFinancialEntry(
  companyId: string,
  entryId: string,
  payload: FinancialEntryUpdate
): Promise<Result<FinancialEntry>> {
  const supabase = createClient();
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

export async function deleteFinancialEntry(
  companyId: string,
  entryId: string
): Promise<Result<true>> {
  const supabase = createClient();
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

export async function markFinancialEntrySettled(
  companyId: string,
  entry: FinancialEntry,
  paymentDate?: string
): Promise<Result<FinancialEntry>> {
  const status =
    entry.entry_type === "payable"
      ? FINANCIAL_STATUS.paid
      : FINANCIAL_STATUS.received;

  return updateFinancialEntry(companyId, entry.id, {
    status,
    payment_date: paymentDate || todayISODate(),
  });
}
