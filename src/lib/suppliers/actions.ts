import { createClient } from "@/lib/supabase/client";
import type { Supplier, SupplierInsert, SupplierUpdate } from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export async function listSuppliers(params: {
  companyId: string;
  search?: string;
  status?: string;
  personType?: string;
}): Promise<Result<Supplier[]>> {
  const supabase = createClient();
  let query = supabase
    .from("suppliers")
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

  return { data: (data ?? []) as Supplier[], error: null };
}

export async function getSupplier(
  companyId: string,
  supplierId: string
): Promise<Result<Supplier>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", supplierId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  if (!data) {
    return { data: null, error: { message: "Fornecedor não encontrado." } };
  }

  return { data: data as Supplier, error: null };
}

export async function createSupplier(
  payload: SupplierInsert
): Promise<Result<Supplier>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as Supplier, error: null };
}

export async function updateSupplier(
  companyId: string,
  supplierId: string,
  payload: SupplierUpdate
): Promise<Result<Supplier>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update(payload as never)
    .eq("company_id", companyId)
    .eq("id", supplierId)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as Supplier, error: null };
}

export async function deleteSupplier(
  companyId: string,
  supplierId: string
): Promise<Result<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("company_id", companyId)
    .eq("id", supplierId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: true, error: null };
}
