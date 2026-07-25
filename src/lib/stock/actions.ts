import { createClient } from "@/lib/supabase/client";
import { STOCK_MOVEMENT_TYPES, type StockMovementType } from "@/lib/constants";
import { toNumberAmount } from "@/lib/stock/format";
import type {
  Product,
  Profile,
  StockMovement,
  StockMovementInsert,
} from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type StockMovementWithRelations = StockMovement & {
  product: Pick<
    Product,
    | "id"
    | "name"
    | "unit"
    | "sku"
    | "internal_code"
    | "current_stock"
    | "cost_price"
    | "tracks_stock"
    | "min_stock"
    | "status"
  > | null;
  responsible: Pick<Profile, "id" | "full_name"> | null;
};

const MOVEMENT_SELECT = `
  *,
  product:products (
    id,
    name,
    unit,
    sku,
    internal_code,
    current_stock,
    cost_price,
    tracks_stock,
    min_stock,
    status
  ),
  responsible:profiles (
    id,
    full_name
  )
`;

function mapPgError(message: string) {
  if (message.includes("Saldo de estoque não pode ficar negativo")) {
    return message;
  }
  if (message.includes("não controla estoque")) {
    return message;
  }
  if (message.includes("não podem ser alteradas")) {
    return message;
  }
  if (message.includes("ficaria negativo")) {
    return message;
  }
  return message;
}

export async function listStockableProducts(
  companyId: string
): Promise<Result<Product[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", companyId)
    .eq("tracks_stock", true)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return { data: (data ?? []) as Product[], error: null };
}

export async function listStockMovements(params: {
  companyId: string;
  search?: string;
  movementType?: string;
  productId?: string;
  periodFrom?: string;
  periodTo?: string;
  limit?: number;
}): Promise<Result<StockMovementWithRelations[]>> {
  const supabase = createClient();
  let query = supabase
    .from("stock_movements")
    .select(MOVEMENT_SELECT)
    .eq("company_id", params.companyId)
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.movementType && params.movementType !== "all") {
    query = query.eq("movement_type", params.movementType);
  }

  if (params.productId) {
    query = query.eq("product_id", params.productId);
  }

  if (params.periodFrom) {
    query = query.gte("movement_date", params.periodFrom);
  }

  if (params.periodTo) {
    query = query.lte("movement_date", params.periodTo);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  let rows = (data ?? []) as StockMovementWithRelations[];

  if (params.search?.trim()) {
    const term = params.search.trim().toLowerCase();
    rows = rows.filter((row) => {
      const productName = row.product?.name?.toLowerCase() ?? "";
      const sku = row.product?.sku?.toLowerCase() ?? "";
      const code = row.product?.internal_code?.toLowerCase() ?? "";
      const notes = row.notes?.toLowerCase() ?? "";
      return (
        productName.includes(term) ||
        sku.includes(term) ||
        code.includes(term) ||
        notes.includes(term)
      );
    });
  }

  return { data: rows, error: null };
}

export async function getStockMovement(
  companyId: string,
  movementId: string
): Promise<Result<StockMovementWithRelations>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select(MOVEMENT_SELECT)
    .eq("company_id", companyId)
    .eq("id", movementId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  if (!data) {
    return {
      data: null,
      error: { message: "Movimentação não encontrada." },
    };
  }

  return { data: data as StockMovementWithRelations, error: null };
}

export async function createStockMovement(params: {
  companyId: string;
  productId: string;
  movementType: StockMovementType;
  quantity: number;
  movementDate: string;
  notes?: string | null;
  adjustmentDirection?: "increase" | "decrease";
}): Promise<Result<StockMovementWithRelations>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: { message: "Usuário não autenticado." } };
  }

  if (!Number.isFinite(params.quantity) || params.quantity <= 0) {
    return {
      data: null,
      error: { message: "Informe uma quantidade maior que zero." },
    };
  }

  const payload: StockMovementInsert = {
    company_id: params.companyId,
    product_id: params.productId,
    movement_type: params.movementType,
    quantity: params.quantity,
    movement_date: params.movementDate,
    notes: params.notes?.trim() || null,
    responsible_user_id: user.id,
  };

  if (params.movementType === STOCK_MOVEMENT_TYPES.adjustment) {
    const direction = params.adjustmentDirection ?? "increase";
    payload.quantity_delta =
      direction === "decrease" ? -params.quantity : params.quantity;
  }

  const { data, error } = await supabase
    .from("stock_movements")
    .insert(payload as never)
    .select(MOVEMENT_SELECT)
    .single();

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return { data: data as StockMovementWithRelations, error: null };
}

export async function deleteStockMovement(
  companyId: string,
  movementId: string
): Promise<Result<true>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("stock_movements")
    .delete()
    .eq("company_id", companyId)
    .eq("id", movementId);

  if (error) {
    return { data: null, error: { message: mapPgError(error.message) } };
  }

  return { data: true, error: null };
}

export type StockDashboardData = {
  totalStockValue: number;
  lowStockProducts: Product[];
  recentMovements: StockMovementWithRelations[];
  entriesToday: number;
  exitsToday: number;
  trackedProductsCount: number;
};

export async function getStockDashboard(
  companyId: string
): Promise<Result<StockDashboardData>> {
  const supabase = createClient();
  const today = new Date();
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const [productsResult, recentResult, todayResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("company_id", companyId)
      .eq("tracks_stock", true)
      .order("name", { ascending: true }),
    supabase
      .from("stock_movements")
      .select(MOVEMENT_SELECT)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("stock_movements")
      .select("id, movement_type, quantity")
      .eq("company_id", companyId)
      .eq("movement_date", todayIso),
  ]);

  if (productsResult.error) {
    return {
      data: null,
      error: { message: mapPgError(productsResult.error.message) },
    };
  }

  if (recentResult.error) {
    return {
      data: null,
      error: { message: mapPgError(recentResult.error.message) },
    };
  }

  if (todayResult.error) {
    return {
      data: null,
      error: { message: mapPgError(todayResult.error.message) },
    };
  }

  const products = (productsResult.data ?? []) as Product[];
  const totalStockValue = products.reduce((sum, product) => {
    return (
      sum +
      toNumberAmount(product.current_stock) * toNumberAmount(product.cost_price)
    );
  }, 0);

  const lowStockProducts = products.filter(
    (product) =>
      toNumberAmount(product.current_stock) < toNumberAmount(product.min_stock)
  );

  const todayRows = (todayResult.data ?? []) as Array<{
    movement_type: string;
    quantity: number | string;
  }>;

  const entriesToday = todayRows
    .filter((row) => row.movement_type === STOCK_MOVEMENT_TYPES.entry)
    .reduce((sum, row) => sum + toNumberAmount(row.quantity), 0);

  const exitsToday = todayRows
    .filter((row) => row.movement_type === STOCK_MOVEMENT_TYPES.exit)
    .reduce((sum, row) => sum + toNumberAmount(row.quantity), 0);

  return {
    data: {
      totalStockValue,
      lowStockProducts,
      recentMovements: (recentResult.data ??
        []) as StockMovementWithRelations[],
      entriesToday,
      exitsToday,
      trackedProductsCount: products.length,
    },
    error: null,
  };
}
