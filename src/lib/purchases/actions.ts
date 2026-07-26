import { createClient } from "@/lib/supabase/client";
import { PURCHASE_STATUS } from "@/lib/constants";
import { calcLineTotal } from "@/lib/purchases/format";
import type {
  Purchase,
  PurchaseInsert,
  PurchaseItem,
  PurchaseItemInsert,
  Product,
  Supplier,
} from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type PurchaseItemWithProduct = PurchaseItem & {
  product: Pick<
    Product,
    "id" | "name" | "unit" | "sku" | "internal_code" | "tracks_stock" | "status"
  > | null;
};

export type PurchaseWithRelations = Purchase & {
  supplier: Pick<Supplier, "id" | "full_name" | "trade_name" | "document"> | null;
  items: PurchaseItemWithProduct[];
};

export type PurchaseListItem = Purchase & {
  supplier: Pick<Supplier, "id" | "full_name" | "trade_name"> | null;
};

export type PurchaseItemInput = {
  product_id: string;
  quantity: number;
  unit_cost: number;
  discount_amount: number;
  sort_order?: number;
};

const PURCHASE_SELECT = `
  *,
  supplier:suppliers (
    id,
    full_name,
    trade_name,
    document
  ),
  items:purchase_items (
    *,
    product:products (
      id,
      name,
      unit,
      sku,
      internal_code,
      tracks_stock,
      status
    )
  )
`;

const LIST_SELECT = `
  *,
  supplier:suppliers (
    id,
    full_name,
    trade_name
  )
`;

function mapPgError(message: string) {
  if (message.includes("já está pago")) return message;
  if (message.includes("sem itens")) return message;
  if (message.includes("fornecedor")) return message;
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

async function callPurchaseRpc(
  fn: "confirm_purchase" | "cancel_purchase" | "recalculate_purchase_totals",
  args: Record<string, unknown>
) {
  const supabase = createClient();
  // Tipagem do supabase.rpc com Functions customizadas exige cast neste projeto.
  return (
    supabase as unknown as {
      rpc: (
        fnName: string,
        params?: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc(fn, args);
}

function sortItems(items: PurchaseItemWithProduct[]) {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function listPurchases(params: {
  companyId: string;
  search?: string;
  status?: string;
  supplierId?: string;
  periodFrom?: string;
  periodTo?: string;
}): Promise<Result<PurchaseListItem[]>> {
  const supabase = createClient();
  let query = supabase
    .from("purchases")
    .select(LIST_SELECT)
    .eq("company_id", params.companyId)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.supplierId && params.supplierId !== "all") {
    query = query.eq("supplier_id", params.supplierId);
  }

  if (params.periodFrom) {
    query = query.gte("purchase_date", params.periodFrom);
  }

  if (params.periodTo) {
    query = query.lte("purchase_date", params.periodTo);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  let rows = (data ?? []) as PurchaseListItem[];

  if (params.search?.trim()) {
    const term = params.search.trim().toLowerCase();
    rows = rows.filter((row) => {
      const doc = row.document_number?.toLowerCase() ?? "";
      const notes = row.notes?.toLowerCase() ?? "";
      const supplierName =
        row.supplier?.trade_name?.toLowerCase() ||
        row.supplier?.full_name?.toLowerCase() ||
        "";
      return (
        doc.includes(term) ||
        notes.includes(term) ||
        supplierName.includes(term) ||
        row.id.toLowerCase().includes(term)
      );
    });
  }

  return { data: rows, error: null };
}

export async function getPurchase(
  companyId: string,
  purchaseId: string
): Promise<Result<PurchaseWithRelations>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchases")
    .select(PURCHASE_SELECT)
    .eq("company_id", companyId)
    .eq("id", purchaseId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  if (!data) {
    return { data: null, error: { message: "Compra não encontrada." } };
  }

  const purchase = data as PurchaseWithRelations;
  purchase.items = sortItems(purchase.items ?? []);

  return { data: purchase, error: null };
}

function validateItems(items: PurchaseItemInput[]): string | null {
  if (items.length === 0) {
    return "Adicione pelo menos um produto à compra.";
  }

  for (const item of items) {
    if (!item.product_id) return "Selecione o produto de cada item.";
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return "A quantidade de cada item deve ser maior que zero.";
    }
    if (!Number.isFinite(item.unit_cost) || item.unit_cost < 0) {
      return "O valor unitário não pode ser negativo.";
    }
    if (!Number.isFinite(item.discount_amount) || item.discount_amount < 0) {
      return "O desconto do item não pode ser negativo.";
    }
    const lineTotal = calcLineTotal(
      item.quantity,
      item.unit_cost,
      item.discount_amount
    );
    if (lineTotal < 0) return "O total do item não pode ser negativo.";
  }

  return null;
}

export async function createPurchase(params: {
  companyId: string;
  header: Omit<PurchaseInsert, "company_id" | "status">;
  items: PurchaseItemInput[];
}): Promise<Result<PurchaseWithRelations>> {
  const validationError = validateItems(params.items);
  if (validationError) {
    return { data: null, error: { message: validationError } };
  }

  if (
    !Number.isFinite(params.header.freight_amount ?? 0) ||
    (params.header.freight_amount ?? 0) < 0
  ) {
    return { data: null, error: { message: "O frete não pode ser negativo." } };
  }

  if (
    !Number.isFinite(params.header.discount_amount ?? 0) ||
    (params.header.discount_amount ?? 0) < 0
  ) {
    return {
      data: null,
      error: { message: "O desconto geral não pode ser negativo." },
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      company_id: params.companyId,
      supplier_id: params.header.supplier_id || null,
      status: PURCHASE_STATUS.draft,
      purchase_date: params.header.purchase_date,
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

  if (purchaseError || !purchase) {
    return {
      data: null,
      error: {
        message: mapPgError(
          purchaseError?.message ?? "Não foi possível criar a compra."
        ),
      },
    };
  }

  const purchaseRow = purchase as Purchase;
  const itemRows: PurchaseItemInsert[] = params.items.map((item, index) => ({
    company_id: params.companyId,
    purchase_id: purchaseRow.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
    discount_amount: item.discount_amount || 0,
    line_total: calcLineTotal(
      item.quantity,
      item.unit_cost,
      item.discount_amount || 0
    ),
    sort_order: item.sort_order ?? index,
  }));

  const { error: itemsError } = await supabase
    .from("purchase_items")
    .insert(itemRows as never);

  if (itemsError) {
    await supabase
      .from("purchases")
      .delete()
      .eq("company_id", params.companyId)
      .eq("id", purchaseRow.id);

    return {
      data: null,
      error: { message: mapPgError(itemsError.message) },
    };
  }

  const { error: recalcError } = await callPurchaseRpc(
    "recalculate_purchase_totals",
    { p_purchase_id: purchaseRow.id }
  );

  if (recalcError) {
    return {
      data: null,
      error: { message: mapPgError(recalcError.message) },
    };
  }

  return getPurchase(params.companyId, purchaseRow.id);
}

export async function updatePurchaseDraft(params: {
  companyId: string;
  purchaseId: string;
  header: Omit<PurchaseInsert, "company_id" | "status">;
  items: PurchaseItemInput[];
}): Promise<Result<PurchaseWithRelations>> {
  const current = await getPurchase(params.companyId, params.purchaseId);
  if (current.error || !current.data) {
    return {
      data: null,
      error: { message: current.error?.message ?? "Compra não encontrada." },
    };
  }

  if (current.data.status !== PURCHASE_STATUS.draft) {
    return {
      data: null,
      error: { message: "Somente compras em rascunho podem ser editadas." },
    };
  }

  const validationError = validateItems(params.items);
  if (validationError) {
    return { data: null, error: { message: validationError } };
  }

  const supabase = createClient();

  const { error: updateError } = await supabase
    .from("purchases")
    .update({
      supplier_id: params.header.supplier_id || null,
      purchase_date: params.header.purchase_date,
      due_date: params.header.due_date || null,
      payment_method: params.header.payment_method || null,
      document_number: params.header.document_number || null,
      notes: params.header.notes || null,
      freight_amount: params.header.freight_amount ?? 0,
      discount_amount: params.header.discount_amount ?? 0,
      payment_terms: params.header.payment_terms || null,
    } as never)
    .eq("company_id", params.companyId)
    .eq("id", params.purchaseId)
    .eq("status", PURCHASE_STATUS.draft);

  if (updateError) {
    return { data: null, error: { message: mapPgError(updateError.message) } };
  }

  const { error: deleteError } = await supabase
    .from("purchase_items")
    .delete()
    .eq("company_id", params.companyId)
    .eq("purchase_id", params.purchaseId);

  if (deleteError) {
    return { data: null, error: { message: mapPgError(deleteError.message) } };
  }

  const itemRows: PurchaseItemInsert[] = params.items.map((item, index) => ({
    company_id: params.companyId,
    purchase_id: params.purchaseId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
    discount_amount: item.discount_amount || 0,
    line_total: calcLineTotal(
      item.quantity,
      item.unit_cost,
      item.discount_amount || 0
    ),
    sort_order: item.sort_order ?? index,
  }));

  const { error: itemsError } = await supabase
    .from("purchase_items")
    .insert(itemRows as never);

  if (itemsError) {
    return { data: null, error: { message: mapPgError(itemsError.message) } };
  }

  const { error: recalcError } = await callPurchaseRpc(
    "recalculate_purchase_totals",
    { p_purchase_id: params.purchaseId }
  );

  if (recalcError) {
    return {
      data: null,
      error: { message: mapPgError(recalcError.message) },
    };
  }

  return getPurchase(params.companyId, params.purchaseId);
}

export async function deletePurchaseDraft(
  companyId: string,
  purchaseId: string
): Promise<Result<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("purchases")
    .delete()
    .eq("company_id", companyId)
    .eq("id", purchaseId)
    .eq("status", PURCHASE_STATUS.draft);

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return { data: true, error: null };
}

export async function confirmPurchase(
  companyId: string,
  purchaseId: string
): Promise<Result<PurchaseWithRelations>> {
  const current = await getPurchase(companyId, purchaseId);
  if (current.error || !current.data) {
    return {
      data: null,
      error: { message: current.error?.message ?? "Compra não encontrada." },
    };
  }

  if (!current.data.supplier_id) {
    return {
      data: null,
      error: {
        message: "Informe o fornecedor antes de confirmar a compra.",
      },
    };
  }

  if (!current.data.items?.length) {
    return {
      data: null,
      error: { message: "Não é possível confirmar uma compra sem itens." },
    };
  }

  const { error } = await callPurchaseRpc("confirm_purchase", {
    p_purchase_id: purchaseId,
  });

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return getPurchase(companyId, purchaseId);
}

export async function cancelPurchase(
  companyId: string,
  purchaseId: string,
  reason?: string | null
): Promise<Result<PurchaseWithRelations>> {
  const { error } = await callPurchaseRpc("cancel_purchase", {
    p_purchase_id: purchaseId,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return getPurchase(companyId, purchaseId);
}
