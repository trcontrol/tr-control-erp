/**
 * Queries de vendas sem gate de módulo Sales.
 * Usado por reports (política própria) e por actions protegidas.
 */
import type {
  Customer,
  Product,
  Sale,
  SaleItem,
  SalePaymentSchedule,
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
  payment_schedules: SalePaymentSchedule[];
};

export type SaleListItem = Sale & {
  customer: Pick<Customer, "id" | "full_name" | "trade_name"> | null;
};

export const SALE_SELECT = `
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
  ),
  payment_schedules:sale_payment_schedules (
    *
  )
`;

export const SALE_LIST_SELECT = `
  *,
  customer:customers (
    id,
    full_name,
    trade_name
  )
`;

/** Cliente Supabase mínimo (browser ou server). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any };

function sortItems(items: SaleItemWithProduct[]) {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });
}

function sortSchedules(rows: SalePaymentSchedule[]) {
  return [...rows].sort((a, b) => {
    if (a.installment_number !== b.installment_number) {
      return a.installment_number - b.installment_number;
    }
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function querySales(
  supabase: SupabaseLike,
  params: {
    companyId: string;
    search?: string;
    status?: string;
    customerId?: string;
    periodFrom?: string;
    periodTo?: string;
  }
): Promise<Result<SaleListItem[]>> {
  let query = supabase
    .from("sales")
    .select(SALE_LIST_SELECT)
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
    return { data: null, error: { message: error.message } };
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

export async function querySale(
  supabase: SupabaseLike,
  companyId: string,
  saleId: string
): Promise<Result<SaleWithRelations>> {
  const { data, error } = await supabase
    .from("sales")
    .select(SALE_SELECT)
    .eq("company_id", companyId)
    .eq("id", saleId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  if (!data) {
    return { data: null, error: { message: "Venda não encontrada." } };
  }

  const sale = data as SaleWithRelations;
  sale.items = sortItems(sale.items ?? []);
  sale.payment_schedules = sortSchedules(sale.payment_schedules ?? []);

  return { data: sale, error: null };
}
