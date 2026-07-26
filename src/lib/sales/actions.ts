import { createClient } from "@/lib/supabase/client";
import { SALE_STATUS } from "@/lib/constants";
import { calcLineTotal } from "@/lib/sales/format";
import type {
  Customer,
  Product,
  Sale,
  SaleInsert,
  SaleItem,
  SaleItemInsert,
} from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type SaleItemWithProduct = SaleItem & {
  product: Pick<
    Product,
    | "id"
    | "name"
    | "unit"
    | "sku"
    | "internal_code"
    | "tracks_stock"
    | "product_type"
    | "status"
    | "sale_price"
  > | null;
};

export type SaleWithRelations = Sale & {
  customer: Pick<
    Customer,
    "id" | "full_name" | "trade_name" | "document"
  > | null;
  items: SaleItemWithProduct[];
};

export type SaleListItem = Sale & {
  customer: Pick<Customer, "id" | "full_name" | "trade_name"> | null;
};

export type SaleItemInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  sort_order?: number;
};

const SALE_SELECT = `
  *,
  customer:customers (
    id,
    full_name,
    trade_name,
    document
  ),
  items:sale_items (
    *,
    product:products (
      id,
      name,
      unit,
      sku,
      internal_code,
      tracks_stock,
      product_type,
      status,
      sale_price
    )
  )
`;

const LIST_SELECT = `
  *,
  customer:customers (
    id,
    full_name,
    trade_name
  )
`;

function mapPgError(message: string) {
  if (message.includes("pago ou recebido") || message.includes("recebido")) {
    return message;
  }
  if (message.includes("Estoque insuficiente")) return message;
  if (message.includes("sem itens")) return message;
  if (message.includes("cliente")) return message;
  if (message.includes("duplicidade") || message.includes("Já existem")) {
    return message;
  }
  if (message.includes("rascunho")) return message;
  if (message.includes("quantidade")) return message;
  if (message.includes("unitário") || message.includes("negativo")) {
    return message;
  }
  return message;
}

async function callSaleRpc(
  fn: "confirm_sale" | "cancel_sale" | "recalculate_sale_totals",
  args: Record<string, unknown>
) {
  const supabase = createClient();
  return (
    supabase as unknown as {
      rpc: (
        fnName: string,
        params?: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc(fn, args);
}

function sortItems(items: SaleItemWithProduct[]) {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function listSales(params: {
  companyId: string;
  search?: string;
  status?: string;
  customerId?: string;
  periodFrom?: string;
  periodTo?: string;
}): Promise<Result<SaleListItem[]>> {
  const supabase = createClient();
  let query = supabase
    .from("sales")
    .select(LIST_SELECT)
    .eq("company_id", params.companyId)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.customerId && params.customerId !== "all") {
    query = query.eq("customer_id", params.customerId);
  }

  if (params.periodFrom) {
    query = query.gte("sale_date", params.periodFrom);
  }

  if (params.periodTo) {
    query = query.lte("sale_date", params.periodTo);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  let rows = (data ?? []) as SaleListItem[];

  if (params.search?.trim()) {
    const term = params.search.trim().toLowerCase();
    rows = rows.filter((row) => {
      const doc = row.document_number?.toLowerCase() ?? "";
      const notes = row.notes?.toLowerCase() ?? "";
      const customerName =
        row.customer?.trade_name?.toLowerCase() ||
        row.customer?.full_name?.toLowerCase() ||
        "";
      return (
        doc.includes(term) ||
        notes.includes(term) ||
        customerName.includes(term) ||
        row.id.toLowerCase().includes(term)
      );
    });
  }

  return { data: rows, error: null };
}

export async function getSale(
  companyId: string,
  saleId: string
): Promise<Result<SaleWithRelations>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(SALE_SELECT)
    .eq("company_id", companyId)
    .eq("id", saleId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  if (!data) {
    return { data: null, error: { message: "Venda não encontrada." } };
  }

  const sale = data as SaleWithRelations;
  sale.items = sortItems(sale.items ?? []);

  return { data: sale, error: null };
}

function validateItems(items: SaleItemInput[]): string | null {
  if (items.length === 0) {
    return "Adicione pelo menos um produto ou serviço à venda.";
  }

  for (const item of items) {
    if (!item.product_id) return "Selecione o produto de cada item.";
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return "A quantidade de cada item deve ser maior que zero.";
    }
    if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
      return "O valor unitário não pode ser negativo.";
    }
    if (!Number.isFinite(item.discount_amount) || item.discount_amount < 0) {
      return "O desconto do item não pode ser negativo.";
    }
  }

  return null;
}

export async function createSale(params: {
  companyId: string;
  header: Omit<SaleInsert, "company_id" | "status">;
  items: SaleItemInput[];
}): Promise<Result<SaleWithRelations>> {
  const validationError = validateItems(params.items);
  if (validationError) {
    return { data: null, error: { message: validationError } };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      company_id: params.companyId,
      customer_id: params.header.customer_id || null,
      status: SALE_STATUS.draft,
      sale_date: params.header.sale_date,
      due_date: params.header.due_date || null,
      payment_method: params.header.payment_method || null,
      document_number: params.header.document_number || null,
      notes: params.header.notes || null,
      freight_amount: params.header.freight_amount ?? 0,
      discount_amount: params.header.discount_amount ?? 0,
      payment_terms: params.header.payment_terms || null,
      created_by: user?.id ?? null,
    } as never)
    .select("*")
    .single();

  if (saleError || !sale) {
    return {
      data: null,
      error: {
        message: mapPgError(
          saleError?.message ?? "Não foi possível criar a venda."
        ),
      },
    };
  }

  const saleRow = sale as Sale;
  const itemRows: SaleItemInsert[] = params.items.map((item, index) => ({
    company_id: params.companyId,
    sale_id: saleRow.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount || 0,
    line_total: calcLineTotal(
      item.quantity,
      item.unit_price,
      item.discount_amount || 0
    ),
    sort_order: item.sort_order ?? index,
  }));

  const { error: itemsError } = await supabase
    .from("sale_items")
    .insert(itemRows as never);

  if (itemsError) {
    await supabase
      .from("sales")
      .delete()
      .eq("company_id", params.companyId)
      .eq("id", saleRow.id);

    return {
      data: null,
      error: { message: mapPgError(itemsError.message) },
    };
  }

  const { error: recalcError } = await callSaleRpc("recalculate_sale_totals", {
    p_sale_id: saleRow.id,
  });

  if (recalcError) {
    return {
      data: null,
      error: { message: mapPgError(recalcError.message) },
    };
  }

  return getSale(params.companyId, saleRow.id);
}

export async function updateSaleDraft(params: {
  companyId: string;
  saleId: string;
  header: Omit<SaleInsert, "company_id" | "status">;
  items: SaleItemInput[];
}): Promise<Result<SaleWithRelations>> {
  const current = await getSale(params.companyId, params.saleId);
  if (current.error || !current.data) {
    return {
      data: null,
      error: { message: current.error?.message ?? "Venda não encontrada." },
    };
  }

  if (current.data.status !== SALE_STATUS.draft) {
    return {
      data: null,
      error: { message: "Somente vendas em rascunho podem ser editadas." },
    };
  }

  const validationError = validateItems(params.items);
  if (validationError) {
    return { data: null, error: { message: validationError } };
  }

  const supabase = createClient();

  const { error: updateError } = await supabase
    .from("sales")
    .update({
      customer_id: params.header.customer_id || null,
      sale_date: params.header.sale_date,
      due_date: params.header.due_date || null,
      payment_method: params.header.payment_method || null,
      document_number: params.header.document_number || null,
      notes: params.header.notes || null,
      freight_amount: params.header.freight_amount ?? 0,
      discount_amount: params.header.discount_amount ?? 0,
      payment_terms: params.header.payment_terms || null,
    } as never)
    .eq("company_id", params.companyId)
    .eq("id", params.saleId)
    .eq("status", SALE_STATUS.draft);

  if (updateError) {
    return { data: null, error: { message: mapPgError(updateError.message) } };
  }

  const { error: deleteError } = await supabase
    .from("sale_items")
    .delete()
    .eq("company_id", params.companyId)
    .eq("sale_id", params.saleId);

  if (deleteError) {
    return { data: null, error: { message: mapPgError(deleteError.message) } };
  }

  const itemRows: SaleItemInsert[] = params.items.map((item, index) => ({
    company_id: params.companyId,
    sale_id: params.saleId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount || 0,
    line_total: calcLineTotal(
      item.quantity,
      item.unit_price,
      item.discount_amount || 0
    ),
    sort_order: item.sort_order ?? index,
  }));

  const { error: itemsError } = await supabase
    .from("sale_items")
    .insert(itemRows as never);

  if (itemsError) {
    return { data: null, error: { message: mapPgError(itemsError.message) } };
  }

  const { error: recalcError } = await callSaleRpc("recalculate_sale_totals", {
    p_sale_id: params.saleId,
  });

  if (recalcError) {
    return {
      data: null,
      error: { message: mapPgError(recalcError.message) },
    };
  }

  return getSale(params.companyId, params.saleId);
}

export async function deleteSaleDraft(
  companyId: string,
  saleId: string
): Promise<Result<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("sales")
    .delete()
    .eq("company_id", companyId)
    .eq("id", saleId)
    .eq("status", SALE_STATUS.draft);

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return { data: true, error: null };
}

export async function confirmSale(
  companyId: string,
  saleId: string
): Promise<Result<SaleWithRelations>> {
  const current = await getSale(companyId, saleId);
  if (current.error || !current.data) {
    return {
      data: null,
      error: { message: current.error?.message ?? "Venda não encontrada." },
    };
  }

  if (!current.data.customer_id) {
    return {
      data: null,
      error: { message: "Informe o cliente antes de confirmar a venda." },
    };
  }

  if (!current.data.items?.length) {
    return {
      data: null,
      error: { message: "Não é possível confirmar uma venda sem itens." },
    };
  }

  const { error } = await callSaleRpc("confirm_sale", {
    p_sale_id: saleId,
  });

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return getSale(companyId, saleId);
}

export async function cancelSale(
  companyId: string,
  saleId: string,
  reason?: string | null
): Promise<Result<SaleWithRelations>> {
  const { error } = await callSaleRpc("cancel_sale", {
    p_sale_id: saleId,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return getSale(companyId, saleId);
}
