/**
 * Queries de compras sem gate de módulo Purchases.
 * Usado por reports (política própria) e por actions protegidas.
 */
import type {
  Product,
  Purchase,
  PurchaseItem,
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
  supplier: Pick<
    Supplier,
    "id" | "full_name" | "trade_name" | "document"
  > | null;
  items: PurchaseItemWithProduct[];
};

export type PurchaseListItem = Purchase & {
  supplier: Pick<Supplier, "id" | "full_name" | "trade_name"> | null;
};

export const PURCHASE_SELECT = `
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

export const PURCHASE_LIST_SELECT = `
  *,
  supplier:suppliers (
    id,
    full_name,
    trade_name
  )
`;

/** Cliente Supabase mínimo (browser ou server). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any };

function sortItems(items: PurchaseItemWithProduct[]) {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function queryPurchases(
  supabase: SupabaseLike,
  params: {
    companyId: string;
    search?: string;
    status?: string;
    supplierId?: string;
    periodFrom?: string;
    periodTo?: string;
  }
): Promise<Result<PurchaseListItem[]>> {
  let query = supabase
    .from("purchases")
    .select(PURCHASE_LIST_SELECT)
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
    return { data: null, error: { message: error.message } };
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

export async function queryPurchase(
  supabase: SupabaseLike,
  companyId: string,
  purchaseId: string
): Promise<Result<PurchaseWithRelations>> {
  const { data, error } = await supabase
    .from("purchases")
    .select(PURCHASE_SELECT)
    .eq("company_id", companyId)
    .eq("id", purchaseId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  if (!data) {
    return { data: null, error: { message: "Compra não encontrada." } };
  }

  const purchase = data as PurchaseWithRelations;
  purchase.items = sortItems(purchase.items ?? []);

  return { data: purchase, error: null };
}
