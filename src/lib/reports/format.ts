import {
  CUSTOMER_STATUS,
  CUSTOMER_STATUS_OPTIONS,
  FINANCIAL_ENTRY_TYPES,
  FINANCIAL_ENTRY_TYPE_OPTIONS,
  FINANCIAL_STATUS,
  FINANCIAL_STATUS_OPTIONS,
  PERSON_TYPE_OPTIONS,
  PURCHASE_STATUS,
  SALE_STATUS,
  STOCK_MOVEMENT_TYPES,
} from "@/lib/constants";
import {
  currentMonthPeriod,
  dayBucketLabel,
  formatCurrency,
  formatDateBR,
  monthBucketLabel,
  toNumberAmount,
} from "@/lib/dashboard/format";
import type { FinancialEntryWithRelations } from "@/lib/finance/actions";
import { isLowStock } from "@/lib/products/format";
import { purchaseStatusLabel } from "@/lib/purchases/format";
import { saleStatusLabel } from "@/lib/sales/format";
import type { PurchaseListItem } from "@/lib/purchases/actions";
import type { SaleListItem } from "@/lib/sales/actions";
import type { StockMovementWithRelations } from "@/lib/stock/actions";
import type { Customer, Product } from "@/types/database";

export {
  currentMonthPeriod,
  dayBucketLabel,
  formatCurrency,
  formatDateBR,
  monthBucketLabel,
  purchaseStatusLabel,
  saleStatusLabel,
  toNumberAmount,
};

export type SalesReportKpis = {
  totalAmount: number;
  salesCount: number;
  averageTicket: number;
  confirmedAmount: number;
  confirmedCount: number;
  draftCount: number;
  cancelledCount: number;
};

export type PurchasesReportKpis = {
  totalAmount: number;
  purchasesCount: number;
  averageTicket: number;
  confirmedAmount: number;
  confirmedCount: number;
  draftCount: number;
  cancelledCount: number;
};

export type SalesReportSeriesPoint = {
  bucket: string;
  total: number;
  count: number;
};

export type PurchasesReportSeriesPoint = SalesReportSeriesPoint;

export type FinanceReportKpis = {
  totalReceitas: number;
  totalDespesas: number;
  saldoPeriodo: number;
  totalAReceber: number;
  totalAPagar: number;
  totalEmAtraso: number;
  entriesCount: number;
  cancelledCount: number;
};

export type FinanceReportSeriesPoint = {
  bucket: string;
  receitas: number;
  despesas: number;
  saldo: number;
};

export type ReceivablesReportKpis = {
  totalAReceber: number;
  totalRecebido: number;
  totalPendente: number;
  totalEmAtraso: number;
  entriesCount: number;
  averageTicket: number;
};

export type ReceivablesReportSeriesPoint = {
  bucket: string;
  received: number;
  pending: number;
  overdue: number;
};

export type PayablesReportKpis = {
  totalAPagar: number;
  totalPago: number;
  totalPendente: number;
  totalEmAtraso: number;
  entriesCount: number;
  averageTicket: number;
};

export type PayablesReportSeriesPoint = {
  bucket: string;
  paid: number;
  pending: number;
  overdue: number;
};

export const STOCK_REPORT_SITUATIONS = {
  all: "all",
  available: "available",
  below_min: "below_min",
  out_of_stock: "out_of_stock",
} as const;

export type StockReportSituation =
  (typeof STOCK_REPORT_SITUATIONS)[keyof typeof STOCK_REPORT_SITUATIONS];

export const STOCK_REPORT_SITUATION_OPTIONS = [
  { value: STOCK_REPORT_SITUATIONS.all, label: "Todos" },
  { value: STOCK_REPORT_SITUATIONS.available, label: "Disponível" },
  { value: STOCK_REPORT_SITUATIONS.below_min, label: "Abaixo do mínimo" },
  { value: STOCK_REPORT_SITUATIONS.out_of_stock, label: "Sem estoque" },
] as const;

export type StockReportKpis = {
  totalStockValue: number;
  totalControlledQuantity: number;
  availableProductsCount: number;
  belowMinProductsCount: number;
  outOfStockProductsCount: number;
  entriesInPeriod: number;
  exitsInPeriod: number;
  trackedProductsCount: number;
};

export type StockReportSeriesPoint = {
  bucket: string;
  entries: number;
  exits: number;
  balance: number;
};

export type StockReportRow = {
  product: Product;
  stockValue: number;
  situation: Exclude<StockReportSituation, "all">;
  situationLabel: string;
  lastMovementDate: string | null;
  codeLabel: string;
};

export type StockLowBalancePoint = {
  productId: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string | null;
};

export function financeStatusLabel(status: string | null | undefined) {
  if (!status) return "—";
  return (
    FINANCIAL_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

export function financeEntryTypeLabel(entryType: string | null | undefined) {
  if (!entryType) return "—";
  return (
    FINANCIAL_ENTRY_TYPE_OPTIONS.find((item) => item.value === entryType)
      ?.label ?? entryType
  );
}

export function customerLabel(
  customer: { full_name: string; trade_name?: string | null } | null | undefined
) {
  if (!customer) return "—";
  return customer.trade_name?.trim() || customer.full_name || "—";
}

export function supplierLabel(
  supplier: { full_name: string; trade_name?: string | null } | null | undefined
) {
  if (!supplier) return "—";
  return supplier.trade_name?.trim() || supplier.full_name || "—";
}

export function buildSalesReportKpis(sales: SaleListItem[]): SalesReportKpis {
  let totalAmount = 0;
  let confirmedAmount = 0;
  let confirmedCount = 0;
  let draftCount = 0;
  let cancelledCount = 0;

  for (const sale of sales) {
    const amount = toNumberAmount(sale.total_amount);
    totalAmount += amount;

    if (sale.status === SALE_STATUS.confirmed) {
      confirmedAmount += amount;
      confirmedCount += 1;
    } else if (sale.status === SALE_STATUS.draft) {
      draftCount += 1;
    } else if (sale.status === SALE_STATUS.cancelled) {
      cancelledCount += 1;
    }
  }

  const salesCount = sales.length;
  const averageTicket = salesCount > 0 ? totalAmount / salesCount : 0;

  return {
    totalAmount,
    salesCount,
    averageTicket,
    confirmedAmount,
    confirmedCount,
    draftCount,
    cancelledCount,
  };
}

export function buildPurchasesReportKpis(
  purchases: PurchaseListItem[]
): PurchasesReportKpis {
  let totalAmount = 0;
  let confirmedAmount = 0;
  let confirmedCount = 0;
  let draftCount = 0;
  let cancelledCount = 0;

  for (const purchase of purchases) {
    const amount = toNumberAmount(purchase.total_amount);
    totalAmount += amount;

    if (purchase.status === PURCHASE_STATUS.confirmed) {
      confirmedAmount += amount;
      confirmedCount += 1;
    } else if (purchase.status === PURCHASE_STATUS.draft) {
      draftCount += 1;
    } else if (purchase.status === PURCHASE_STATUS.cancelled) {
      cancelledCount += 1;
    }
  }

  const purchasesCount = purchases.length;
  const averageTicket = purchasesCount > 0 ? totalAmount / purchasesCount : 0;

  return {
    totalAmount,
    purchasesCount,
    averageTicket,
    confirmedAmount,
    confirmedCount,
    draftCount,
    cancelledCount,
  };
}

function monthBucketFromDate(isoDate: string) {
  return isoDate.slice(0, 7) + "-01";
}

function periodSpanDays(periodFrom: string, periodTo: string) {
  const from = new Date(`${periodFrom}T00:00:00`);
  const to = new Date(`${periodTo}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 31;
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

export function buildSalesReportSeries(
  sales: SaleListItem[],
  periodFrom: string,
  periodTo: string
): SalesReportSeriesPoint[] {
  const useDaily = (() => {
    const spanDays = periodSpanDays(periodFrom, periodTo);
    return spanDays > 0 && spanDays <= 45;
  })();
  const buckets = new Map<string, SalesReportSeriesPoint>();

  for (const sale of sales) {
    if (sale.status === SALE_STATUS.cancelled) continue;

    const bucket = useDaily
      ? sale.sale_date
      : monthBucketFromDate(sale.sale_date);

    if (!bucket) continue;

    const current = buckets.get(bucket) ?? { bucket, total: 0, count: 0 };
    current.total += toNumberAmount(sale.total_amount);
    current.count += 1;
    buckets.set(bucket, current);
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.bucket.localeCompare(b.bucket)
  );
}

export function buildPurchasesReportSeries(
  purchases: PurchaseListItem[],
  periodFrom: string,
  periodTo: string
): PurchasesReportSeriesPoint[] {
  const spanDays = periodSpanDays(periodFrom, periodTo);
  const useDaily = spanDays > 0 && spanDays <= 45;
  const buckets = new Map<string, PurchasesReportSeriesPoint>();

  for (const purchase of purchases) {
    if (purchase.status === PURCHASE_STATUS.cancelled) continue;

    const bucket = useDaily
      ? purchase.purchase_date
      : monthBucketFromDate(purchase.purchase_date);

    if (!bucket) continue;

    const current = buckets.get(bucket) ?? { bucket, total: 0, count: 0 };
    current.total += toNumberAmount(purchase.total_amount);
    current.count += 1;
    buckets.set(bucket, current);
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.bucket.localeCompare(b.bucket)
  );
}

export function seriesPointLabel(bucket: string, daily: boolean) {
  return daily ? dayBucketLabel(bucket) : monthBucketLabel(bucket);
}

export function isDailySeries(
  periodFrom: string,
  periodTo: string
): boolean {
  const from = new Date(`${periodFrom}T00:00:00`);
  const to = new Date(`${periodTo}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;
  const spanDays =
    Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return spanDays > 0 && spanDays <= 45;
}

export function filterFinanceEntriesByCategory(
  entries: FinancialEntryWithRelations[],
  category: string
) {
  if (!category || category === "all") return entries;
  return entries.filter((entry) => (entry.category ?? "") === category);
}

export function filterFinanceEntriesByCustomer(
  entries: FinancialEntryWithRelations[],
  customerId: string
) {
  if (!customerId || customerId === "all") return entries;
  return entries.filter((entry) => entry.customer_id === customerId);
}

export function filterFinanceEntriesBySupplier(
  entries: FinancialEntryWithRelations[],
  supplierId: string
) {
  if (!supplierId || supplierId === "all") return entries;
  return entries.filter((entry) => entry.supplier_id === supplierId);
}

export function receivablePartyLabel(entry: FinancialEntryWithRelations) {
  const linked = customerLabel(entry.customer);
  if (linked !== "—") return linked;
  const party = entry.party_name?.trim();
  return party || "—";
}

export function payablePartyLabel(entry: FinancialEntryWithRelations) {
  const linked = supplierLabel(entry.supplier);
  if (linked !== "—") return linked;
  const party = entry.party_name?.trim();
  return party || "—";
}

export function buildFinanceReportKpis(
  entries: FinancialEntryWithRelations[]
): FinanceReportKpis {
  let totalReceitas = 0;
  let totalDespesas = 0;
  let totalAReceber = 0;
  let totalAPagar = 0;
  let totalEmAtraso = 0;
  let cancelledCount = 0;

  for (const entry of entries) {
    const amount = toNumberAmount(entry.amount);
    const isCancelled = entry.status === FINANCIAL_STATUS.cancelled;
    const isOpen =
      entry.status === FINANCIAL_STATUS.pending ||
      entry.status === FINANCIAL_STATUS.overdue;

    if (isCancelled) {
      cancelledCount += 1;
    }

    if (!isCancelled) {
      if (entry.entry_type === FINANCIAL_ENTRY_TYPES.receivable) {
        totalReceitas += amount;
      } else if (entry.entry_type === FINANCIAL_ENTRY_TYPES.payable) {
        totalDespesas += amount;
      }
    }

    if (isOpen) {
      if (entry.entry_type === FINANCIAL_ENTRY_TYPES.receivable) {
        totalAReceber += amount;
      } else if (entry.entry_type === FINANCIAL_ENTRY_TYPES.payable) {
        totalAPagar += amount;
      }
    }

    if (entry.status === FINANCIAL_STATUS.overdue) {
      totalEmAtraso += amount;
    }
  }

  return {
    totalReceitas,
    totalDespesas,
    saldoPeriodo: totalReceitas - totalDespesas,
    totalAReceber,
    totalAPagar,
    totalEmAtraso,
    entriesCount: entries.length,
    cancelledCount,
  };
}

export function buildFinanceReportSeries(
  entries: FinancialEntryWithRelations[],
  periodFrom: string,
  periodTo: string
): FinanceReportSeriesPoint[] {
  const useDaily = isDailySeries(periodFrom, periodTo);
  const buckets = new Map<string, FinanceReportSeriesPoint>();

  for (const entry of entries) {
    if (entry.status === FINANCIAL_STATUS.cancelled) continue;

    const bucket = useDaily
      ? entry.due_date
      : monthBucketFromDate(entry.due_date);

    if (!bucket) continue;

    const current = buckets.get(bucket) ?? {
      bucket,
      receitas: 0,
      despesas: 0,
      saldo: 0,
    };
    const amount = toNumberAmount(entry.amount);

    if (entry.entry_type === FINANCIAL_ENTRY_TYPES.receivable) {
      current.receitas += amount;
    } else if (entry.entry_type === FINANCIAL_ENTRY_TYPES.payable) {
      current.despesas += amount;
    }

    current.saldo = current.receitas - current.despesas;
    buckets.set(bucket, current);
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.bucket.localeCompare(b.bucket)
  );
}

export function buildReceivablesReportKpis(
  entries: FinancialEntryWithRelations[]
): ReceivablesReportKpis {
  let totalAReceber = 0;
  let totalRecebido = 0;
  let totalPendente = 0;
  let totalEmAtraso = 0;
  let validCount = 0;

  for (const entry of entries) {
    if (entry.status === FINANCIAL_STATUS.cancelled) continue;

    const amount = toNumberAmount(entry.amount);
    totalAReceber += amount;
    validCount += 1;

    if (entry.status === FINANCIAL_STATUS.received) {
      totalRecebido += amount;
    } else if (entry.status === FINANCIAL_STATUS.pending) {
      totalPendente += amount;
    } else if (entry.status === FINANCIAL_STATUS.overdue) {
      totalEmAtraso += amount;
    }
  }

  return {
    totalAReceber,
    totalRecebido,
    totalPendente,
    totalEmAtraso,
    entriesCount: entries.length,
    averageTicket: validCount > 0 ? totalAReceber / validCount : 0,
  };
}

export function buildReceivablesReportSeries(
  entries: FinancialEntryWithRelations[],
  periodFrom: string,
  periodTo: string
): ReceivablesReportSeriesPoint[] {
  const useDaily = isDailySeries(periodFrom, periodTo);
  const buckets = new Map<string, ReceivablesReportSeriesPoint>();

  for (const entry of entries) {
    if (entry.status === FINANCIAL_STATUS.cancelled) continue;

    const bucket = useDaily
      ? entry.due_date
      : monthBucketFromDate(entry.due_date);

    if (!bucket) continue;

    const current = buckets.get(bucket) ?? {
      bucket,
      received: 0,
      pending: 0,
      overdue: 0,
    };
    const amount = toNumberAmount(entry.amount);

    if (entry.status === FINANCIAL_STATUS.received) {
      current.received += amount;
    } else if (entry.status === FINANCIAL_STATUS.pending) {
      current.pending += amount;
    } else if (entry.status === FINANCIAL_STATUS.overdue) {
      current.overdue += amount;
    }

    buckets.set(bucket, current);
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.bucket.localeCompare(b.bucket)
  );
}

export function buildPayablesReportKpis(
  entries: FinancialEntryWithRelations[]
): PayablesReportKpis {
  let totalAPagar = 0;
  let totalPago = 0;
  let totalPendente = 0;
  let totalEmAtraso = 0;
  let validCount = 0;

  for (const entry of entries) {
    if (entry.status === FINANCIAL_STATUS.cancelled) continue;

    const amount = toNumberAmount(entry.amount);
    totalAPagar += amount;
    validCount += 1;

    if (entry.status === FINANCIAL_STATUS.paid) {
      totalPago += amount;
    } else if (entry.status === FINANCIAL_STATUS.pending) {
      totalPendente += amount;
    } else if (entry.status === FINANCIAL_STATUS.overdue) {
      totalEmAtraso += amount;
    }
  }

  return {
    totalAPagar,
    totalPago,
    totalPendente,
    totalEmAtraso,
    entriesCount: entries.length,
    averageTicket: validCount > 0 ? totalAPagar / validCount : 0,
  };
}

export function buildPayablesReportSeries(
  entries: FinancialEntryWithRelations[],
  periodFrom: string,
  periodTo: string
): PayablesReportSeriesPoint[] {
  const useDaily = isDailySeries(periodFrom, periodTo);
  const buckets = new Map<string, PayablesReportSeriesPoint>();

  for (const entry of entries) {
    if (entry.status === FINANCIAL_STATUS.cancelled) continue;

    const bucket = useDaily
      ? entry.due_date
      : monthBucketFromDate(entry.due_date);

    if (!bucket) continue;

    const current = buckets.get(bucket) ?? {
      bucket,
      paid: 0,
      pending: 0,
      overdue: 0,
    };
    const amount = toNumberAmount(entry.amount);

    if (entry.status === FINANCIAL_STATUS.paid) {
      current.paid += amount;
    } else if (entry.status === FINANCIAL_STATUS.pending) {
      current.pending += amount;
    } else if (entry.status === FINANCIAL_STATUS.overdue) {
      current.overdue += amount;
    }

    buckets.set(bucket, current);
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.bucket.localeCompare(b.bucket)
  );
}

export function productStockValue(product: {
  current_stock: number | string;
  cost_price: number | string;
}) {
  return toNumberAmount(product.current_stock) * toNumberAmount(product.cost_price);
}

export function productCodeLabel(product: {
  sku?: string | null;
  internal_code?: string | null;
}) {
  const sku = product.sku?.trim();
  if (sku) return sku;
  const code = product.internal_code?.trim();
  if (code) return code;
  return "—";
}

export function resolveStockSituation(product: {
  current_stock: number | string;
  min_stock: number | string;
  tracks_stock?: boolean | null;
}): Exclude<StockReportSituation, "all"> {
  const stock = toNumberAmount(product.current_stock);
  if (stock <= 0) return STOCK_REPORT_SITUATIONS.out_of_stock;
  if (isLowStock(product)) return STOCK_REPORT_SITUATIONS.below_min;
  return STOCK_REPORT_SITUATIONS.available;
}

export function stockSituationLabel(
  situation: StockReportSituation | string | null | undefined
) {
  if (!situation) return "—";
  return (
    STOCK_REPORT_SITUATION_OPTIONS.find((item) => item.value === situation)
      ?.label ?? situation
  );
}

export function filterStockProducts(
  products: Product[],
  filters: {
    productId?: string;
    category?: string;
    situation?: string;
  }
) {
  const productId = filters.productId ?? "all";
  const category = filters.category ?? "all";
  const situation = filters.situation ?? STOCK_REPORT_SITUATIONS.all;

  return products.filter((product) => {
    if (productId !== "all" && product.id !== productId) return false;
    if (category !== "all" && (product.category ?? "") !== category) {
      return false;
    }
    if (situation === STOCK_REPORT_SITUATIONS.below_min) {
      return isLowStock(product);
    }
    if (situation === STOCK_REPORT_SITUATIONS.available) {
      return toNumberAmount(product.current_stock) > 0;
    }
    if (situation === STOCK_REPORT_SITUATIONS.out_of_stock) {
      return toNumberAmount(product.current_stock) === 0;
    }
    return true;
  });
}

export function filterStockMovementsByProductIds(
  movements: StockMovementWithRelations[],
  productIds: Set<string> | null
) {
  if (!productIds) return movements;
  return movements.filter((movement) => productIds.has(movement.product_id));
}

export function buildStockReportKpis(
  products: Product[],
  movements: StockMovementWithRelations[]
): StockReportKpis {
  let totalStockValue = 0;
  let totalControlledQuantity = 0;
  let availableProductsCount = 0;
  let belowMinProductsCount = 0;
  let outOfStockProductsCount = 0;

  for (const product of products) {
    const stock = toNumberAmount(product.current_stock);
    totalStockValue += stock * toNumberAmount(product.cost_price);
    totalControlledQuantity += stock;

    if (stock > 0) availableProductsCount += 1;
    if (stock === 0) outOfStockProductsCount += 1;
    if (isLowStock(product)) belowMinProductsCount += 1;
  }

  let entriesInPeriod = 0;
  let exitsInPeriod = 0;

  for (const movement of movements) {
    const quantity = toNumberAmount(movement.quantity);
    if (movement.movement_type === STOCK_MOVEMENT_TYPES.entry) {
      entriesInPeriod += quantity;
    } else if (movement.movement_type === STOCK_MOVEMENT_TYPES.exit) {
      exitsInPeriod += quantity;
    }
  }

  return {
    totalStockValue,
    totalControlledQuantity,
    availableProductsCount,
    belowMinProductsCount,
    outOfStockProductsCount,
    entriesInPeriod,
    exitsInPeriod,
    trackedProductsCount: products.length,
  };
}

export function buildStockReportSeries(
  movements: StockMovementWithRelations[],
  periodFrom: string,
  periodTo: string
): StockReportSeriesPoint[] {
  const useDaily = isDailySeries(periodFrom, periodTo);
  const buckets = new Map<string, StockReportSeriesPoint>();

  for (const movement of movements) {
    if (
      movement.movement_type !== STOCK_MOVEMENT_TYPES.entry &&
      movement.movement_type !== STOCK_MOVEMENT_TYPES.exit
    ) {
      continue;
    }

    const bucket = useDaily
      ? movement.movement_date
      : monthBucketFromDate(movement.movement_date);

    if (!bucket) continue;

    const current = buckets.get(bucket) ?? {
      bucket,
      entries: 0,
      exits: 0,
      balance: 0,
    };
    const quantity = toNumberAmount(movement.quantity);

    if (movement.movement_type === STOCK_MOVEMENT_TYPES.entry) {
      current.entries += quantity;
    } else {
      current.exits += quantity;
    }

    current.balance = current.entries - current.exits;
    buckets.set(bucket, current);
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.bucket.localeCompare(b.bucket)
  );
}

export function buildStockReportRows(
  products: Product[],
  lastMovementByProductId: Map<string, string>
): StockReportRow[] {
  return products
    .map((product) => {
      const situation = resolveStockSituation(product);
      return {
        product,
        stockValue: productStockValue(product),
        situation,
        situationLabel: stockSituationLabel(situation),
        lastMovementDate: lastMovementByProductId.get(product.id) ?? null,
        codeLabel: productCodeLabel(product),
      };
    })
    .sort((a, b) => a.product.name.localeCompare(b.product.name, "pt-BR"));
}

export function buildStockLowBalanceSeries(
  products: Product[],
  limit = 8
): StockLowBalancePoint[] {
  return [...products]
    .sort(
      (a, b) =>
        toNumberAmount(a.current_stock) - toNumberAmount(b.current_stock) ||
        a.name.localeCompare(b.name, "pt-BR")
    )
    .slice(0, limit)
    .map((product) => ({
      productId: product.id,
      name: product.name,
      currentStock: toNumberAmount(product.current_stock),
      minStock: toNumberAmount(product.min_stock),
      unit: product.unit ?? null,
    }));
}

/** Sentinel for customers without city/state in report filters. */
export const CUSTOMERS_REPORT_EMPTY_GEO = "__empty__";

export type CustomersReportKpis = {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  newInPeriod: number;
  withSales: number;
  withoutSales: number;
  averageTicketPerCustomer: number;
};

export type CustomersReportSeriesPoint = {
  bucket: string;
  newCustomers: number;
  cumulativeTotal: number;
};

export type CustomersSalesDistributionPoint = {
  key: "with_sales" | "without_sales";
  label: string;
  count: number;
  percentage: number;
};

export type CustomersReportRow = {
  customer: Customer;
  salesCount: number;
  totalPurchased: number;
};

export type CustomerSalesAgg = {
  salesCount: number;
  totalPurchased: number;
};

export function customerStatusLabel(status: string | null | undefined) {
  if (!status) return "—";
  return (
    CUSTOMER_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

export function personTypeLabel(personType: string | null | undefined) {
  if (!personType) return "—";
  return (
    PERSON_TYPE_OPTIONS.find((item) => item.value === personType)?.label ??
    personType
  );
}

export function customerCreatedDate(customer: { created_at: string }) {
  return customer.created_at.slice(0, 10);
}

function normalizeGeoField(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

export function customerGeoKey(value: string | null | undefined) {
  return normalizeGeoField(value) ?? CUSTOMERS_REPORT_EMPTY_GEO;
}

export function customerGeoLabel(value: string | null | undefined) {
  return normalizeGeoField(value) ?? "—";
}

export function buildCustomerSalesAggMap(
  sales: SaleListItem[]
): Map<string, CustomerSalesAgg> {
  const map = new Map<string, CustomerSalesAgg>();

  for (const sale of sales) {
    if (sale.status !== SALE_STATUS.confirmed || !sale.customer_id) continue;

    const current = map.get(sale.customer_id) ?? {
      salesCount: 0,
      totalPurchased: 0,
    };
    current.salesCount += 1;
    current.totalPurchased += toNumberAmount(sale.total_amount);
    map.set(sale.customer_id, current);
  }

  return map;
}

export function filterCustomersForReport(
  customers: Customer[],
  filters: {
    status?: string;
    personType?: string;
    state?: string;
    city?: string;
  }
) {
  const status = filters.status ?? "all";
  const personType = filters.personType ?? "all";
  const state = filters.state ?? "all";
  const city = filters.city ?? "all";

  return customers.filter((customer) => {
    if (status !== "all" && customer.status !== status) return false;
    if (personType !== "all" && customer.person_type !== personType) {
      return false;
    }
    if (state !== "all" && customerGeoKey(customer.state) !== state) {
      return false;
    }
    if (city !== "all" && customerGeoKey(customer.city) !== city) {
      return false;
    }
    return true;
  });
}

export function buildCustomerStateOptions(customers: Customer[]) {
  const states = new Set<string>();
  let hasEmpty = false;

  for (const customer of customers) {
    const normalized = normalizeGeoField(customer.state);
    if (normalized) states.add(normalized);
    else hasEmpty = true;
  }

  const options = Array.from(states)
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((value) => ({ value, label: value }));

  if (hasEmpty) {
    options.push({
      value: CUSTOMERS_REPORT_EMPTY_GEO,
      label: "Sem estado",
    });
  }

  return options;
}

export function buildCustomerCityOptions(
  customers: Customer[],
  state?: string
) {
  const selectedState = state ?? "all";
  const cities = new Set<string>();
  let hasEmpty = false;

  for (const customer of customers) {
    if (
      selectedState !== "all" &&
      customerGeoKey(customer.state) !== selectedState
    ) {
      continue;
    }

    const normalized = normalizeGeoField(customer.city);
    if (normalized) cities.add(normalized);
    else hasEmpty = true;
  }

  const options = Array.from(cities)
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((value) => ({ value, label: value }));

  if (hasEmpty) {
    options.push({
      value: CUSTOMERS_REPORT_EMPTY_GEO,
      label: "Sem cidade",
    });
  }

  return options;
}

export function buildCustomersReportKpis(
  customers: Customer[],
  salesByCustomer: Map<string, CustomerSalesAgg>,
  periodFrom: string,
  periodTo: string
): CustomersReportKpis {
  let activeCustomers = 0;
  let inactiveCustomers = 0;
  let newInPeriod = 0;
  let withSales = 0;
  let withoutSales = 0;
  let confirmedSalesAmount = 0;

  for (const customer of customers) {
    if (customer.status === CUSTOMER_STATUS.active) activeCustomers += 1;
    else if (customer.status === CUSTOMER_STATUS.inactive) {
      inactiveCustomers += 1;
    }

    const created = customerCreatedDate(customer);
    if (created >= periodFrom && created <= periodTo) {
      newInPeriod += 1;
    }

    const agg = salesByCustomer.get(customer.id);
    if (agg && agg.salesCount > 0) {
      withSales += 1;
      confirmedSalesAmount += agg.totalPurchased;
    } else {
      withoutSales += 1;
    }
  }

  return {
    totalCustomers: customers.length,
    activeCustomers,
    inactiveCustomers,
    newInPeriod,
    withSales,
    withoutSales,
    averageTicketPerCustomer:
      withSales > 0 ? confirmedSalesAmount / withSales : 0,
  };
}

function formatLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPeriodBuckets(periodFrom: string, periodTo: string) {
  const useDaily = isDailySeries(periodFrom, periodTo);
  const buckets: string[] = [];
  const from = new Date(`${periodFrom}T00:00:00`);
  const to = new Date(`${periodTo}T00:00:00`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return { useDaily, buckets };
  }

  if (useDaily) {
    const cursor = new Date(from);
    while (cursor <= to) {
      buckets.push(formatLocalIsoDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= end) {
      buckets.push(formatLocalIsoDate(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return { useDaily, buckets };
}

export function buildCustomersReportSeries(
  customers: Customer[],
  periodFrom: string,
  periodTo: string
): CustomersReportSeriesPoint[] {
  const { useDaily, buckets } = buildPeriodBuckets(periodFrom, periodTo);
  if (!buckets.length) return [];

  let baseBeforePeriod = 0;
  const newByBucket = new Map<string, number>();

  for (const customer of customers) {
    const created = customerCreatedDate(customer);
    if (!created) continue;

    if (created < periodFrom) {
      baseBeforePeriod += 1;
      continue;
    }

    if (created > periodTo) continue;

    const bucket = useDaily ? created : monthBucketFromDate(created);
    newByBucket.set(bucket, (newByBucket.get(bucket) ?? 0) + 1);
  }

  let cumulative = baseBeforePeriod;
  return buckets.map((bucket) => {
    const newCustomers = newByBucket.get(bucket) ?? 0;
    cumulative += newCustomers;
    return {
      bucket,
      newCustomers,
      cumulativeTotal: cumulative,
    };
  });
}

export function buildCustomersSalesDistribution(
  kpis: CustomersReportKpis
): CustomersSalesDistributionPoint[] {
  const total = kpis.withSales + kpis.withoutSales;
  const withPct = total > 0 ? (kpis.withSales / total) * 100 : 0;
  const withoutPct = total > 0 ? (kpis.withoutSales / total) * 100 : 0;

  return [
    {
      key: "with_sales",
      label: "Com vendas",
      count: kpis.withSales,
      percentage: withPct,
    },
    {
      key: "without_sales",
      label: "Sem vendas",
      count: kpis.withoutSales,
      percentage: withoutPct,
    },
  ];
}

export function buildCustomersReportRows(
  customers: Customer[],
  salesByCustomer: Map<string, CustomerSalesAgg>
): CustomersReportRow[] {
  return [...customers]
    .map((customer) => {
      const agg = salesByCustomer.get(customer.id);
      return {
        customer,
        salesCount: agg?.salesCount ?? 0,
        totalPurchased: agg?.totalPurchased ?? 0,
      };
    })
    .sort((a, b) => {
      const nameA = customerLabel(a.customer);
      const nameB = customerLabel(b.customer);
      return nameA.localeCompare(nameB, "pt-BR");
    });
}
