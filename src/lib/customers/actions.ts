import { createClient } from "@/lib/supabase/client";
import type { Customer, CustomerInsert, CustomerUpdate } from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export async function listCustomers(params: {
  companyId: string;
  search?: string;
  status?: string;
  personType?: string;
}): Promise<Result<Customer[]>> {
  const supabase = createClient();
  let query = supabase
    .from("customers")
    .select("*")
    .eq("company_id", params.companyId)
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.personType && params.personType !== "all") {
    query = query.eq("person_type", params.personType);
  }

  if (params.search?.trim()) {
    const term = params.search.trim();
    query = query.or(
      `full_name.ilike.%${term}%,trade_name.ilike.%${term}%,document.ilike.%${term}%,email.ilike.%${term}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: (data ?? []) as Customer[], error: null };
}

export async function getCustomer(
  companyId: string,
  customerId: string
): Promise<Result<Customer>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  if (!data) {
    return { data: null, error: { message: "Cliente não encontrado." } };
  }

  return { data: data as Customer, error: null };
}

export async function createCustomer(
  payload: CustomerInsert
): Promise<Result<Customer>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as Customer, error: null };
}

export async function updateCustomer(
  companyId: string,
  customerId: string,
  payload: CustomerUpdate
): Promise<Result<Customer>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .update(payload as never)
    .eq("company_id", companyId)
    .eq("id", customerId)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as Customer, error: null };
}

export async function deleteCustomer(
  companyId: string,
  customerId: string
): Promise<Result<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("company_id", companyId)
    .eq("id", customerId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: true, error: null };
}
