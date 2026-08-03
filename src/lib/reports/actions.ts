import { FINANCIAL_ENTRY_TYPES } from "@/lib/constants";
import { listCustomers } from "@/lib/customers/actions";
import {
  listFinancialEntries,
  type FinancialEntryWithRelations,
} from "@/lib/finance/actions";
import { listProductFilterOptions } from "@/lib/products/actions";
import { listPurchases, type PurchaseListItem } from "@/lib/purchases/actions";
import { listSales, type SaleListItem } from "@/lib/sales/actions";
import {
  listStockMovements,
  type StockMovementWithRelations,
} from "@/lib/stock/actions";
import { listSuppliers } from "@/lib/suppliers/actions";
import { createClient } from "@/lib/supabase/client";
import type { Customer, Product, Supplier } from "@/types/database";
import {
  buildFinanceReportKpis,
  buildFinanceReportSeries,
  buildPurchasesReportKpis,
  buildPurchasesReportSeries,
  buildPayablesReportKpis,
  buildPayablesReportSeries,
  buildReceivablesReportKpis,
  buildReceivablesReportSeries,
  buildSalesReportKpis,
  buildSalesReportSeries,
  buildStockLowBalanceSeries,
  buildStockReportKpis,
  buildStockReportRows,
  buildStockReportSeries,
  filterFinanceEntriesByCategory,
  filterFinanceEntriesByCustomer,
  filterFinanceEntriesBySupplier,
  filterStockMovementsByProductIds,
  filterStockProducts,
  type FinanceReportKpis,
  type FinanceReportSeriesPoint,
  type PayablesReportKpis,
  type PayablesReportSeriesPoint,
  type PurchasesReportKpis,
  type PurchasesReportSeriesPoint,
  type ReceivablesReportKpis,
  type ReceivablesReportSeriesPoint,
  type SalesReportKpis,
  type SalesReportSeriesPoint,
  type StockLowBalancePoint,
  type StockReportKpis,
  type StockReportRow,
  type StockReportSeriesPoint,
} from "@/lib/reports/format";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type SalesReportData = {
  sales: SaleListItem[];
  customers: Customer[];
  kpis: SalesReportKpis;
  series: SalesReportSeriesPoint[];
};

export type PurchasesReportData = {
  purchases: PurchaseListItem[];
  suppliers: Supplier[];
  kpis: PurchasesReportKpis;
  series: PurchasesReportSeriesPoint[];
};

export type FinanceReportData = {
  entries: FinancialEntryWithRelations[];
  kpis: FinanceReportKpis;
  series: FinanceReportSeriesPoint[];
};

export type ReceivablesReportData = {
  entries: FinancialEntryWithRelations[];
  customers: Customer[];
  kpis: ReceivablesReportKpis;
  series: ReceivablesReportSeriesPoint[];
};

export type PayablesReportData = {
  entries: FinancialEntryWithRelations[];
  suppliers: Supplier[];
  kpis: PayablesReportKpis;
  series: PayablesReportSeriesPoint[];
};

export type StockReportData = {
  products: Product[];
  rows: StockReportRow[];
  movements: StockMovementWithRelations[];
  categories: string[];
  kpis: StockReportKpis;
  series: StockReportSeriesPoint[];
  lowBalanceSeries: StockLowBalancePoint[];
};

export async function getSalesReport(params: {
  companyId: string;
  status?: string;
  customerId?: string;
  periodFrom: string;
  periodTo: string;
}): Promise<Result<SalesReportData>> {
  const [salesResult, customersResult] = await Promise.all([
    listSales({
      companyId: params.companyId,
      status: params.status,
      customerId: params.customerId,
      periodFrom: params.periodFrom,
      periodTo: params.periodTo,
    }),
    listCustomers({ companyId: params.companyId, status: "active" }),
  ]);

  if (salesResult.error) {
    return { data: null, error: salesResult.error };
  }

  const sales = salesResult.data;
  const customers = customersResult.data ?? [];

  return {
    data: {
      sales,
      customers,
      kpis: buildSalesReportKpis(sales),
      series: buildSalesReportSeries(
        sales,
        params.periodFrom,
        params.periodTo
      ),
    },
    error: null,
  };
}

export async function getPurchasesReport(params: {
  companyId: string;
  status?: string;
  supplierId?: string;
  periodFrom: string;
  periodTo: string;
}): Promise<Result<PurchasesReportData>> {
  const [purchasesResult, suppliersResult] = await Promise.all([
    listPurchases({
      companyId: params.companyId,
      status: params.status,
      supplierId: params.supplierId,
      periodFrom: params.periodFrom,
      periodTo: params.periodTo,
    }),
    listSuppliers({ companyId: params.companyId, status: "active" }),
  ]);

  if (purchasesResult.error) {
    return { data: null, error: purchasesResult.error };
  }

  const purchases = purchasesResult.data;
  const suppliers = suppliersResult.data ?? [];

  return {
    data: {
      purchases,
      suppliers,
      kpis: buildPurchasesReportKpis(purchases),
      series: buildPurchasesReportSeries(
        purchases,
        params.periodFrom,
        params.periodTo
      ),
    },
    error: null,
  };
}

export async function getFinanceReport(params: {
  companyId: string;
  entryType?: string;
  status?: string;
  category?: string;
  periodFrom: string;
  periodTo: string;
}): Promise<Result<FinanceReportData>> {
  const result = await listFinancialEntries({
    companyId: params.companyId,
    entryType: params.entryType,
    status: params.status,
    periodFrom: params.periodFrom,
    periodTo: params.periodTo,
  });

  if (result.error || !result.data) {
    return {
      data: null,
      error: result.error ?? { message: "Erro ao carregar o relatório." },
    };
  }

  const entries = filterFinanceEntriesByCategory(
    result.data,
    params.category ?? "all"
  );

  return {
    data: {
      entries,
      kpis: buildFinanceReportKpis(entries),
      series: buildFinanceReportSeries(
        entries,
        params.periodFrom,
        params.periodTo
      ),
    },
    error: null,
  };
}

export async function getReceivablesReport(params: {
  companyId: string;
  status?: string;
  customerId?: string;
  category?: string;
  periodFrom: string;
  periodTo: string;
}): Promise<Result<ReceivablesReportData>> {
  const [entriesResult, customersResult] = await Promise.all([
    listFinancialEntries({
      companyId: params.companyId,
      entryType: FINANCIAL_ENTRY_TYPES.receivable,
      status: params.status,
      periodFrom: params.periodFrom,
      periodTo: params.periodTo,
    }),
    listCustomers({ companyId: params.companyId, status: "active" }),
  ]);

  if (entriesResult.error || !entriesResult.data) {
    return {
      data: null,
      error:
        entriesResult.error ?? { message: "Erro ao carregar o relatório." },
    };
  }

  const entries = filterFinanceEntriesByCustomer(
    filterFinanceEntriesByCategory(
      entriesResult.data,
      params.category ?? "all"
    ),
    params.customerId ?? "all"
  );

  return {
    data: {
      entries,
      customers: customersResult.data ?? [],
      kpis: buildReceivablesReportKpis(entries),
      series: buildReceivablesReportSeries(
        entries,
        params.periodFrom,
        params.periodTo
      ),
    },
    error: null,
  };
}

export async function getPayablesReport(params: {
  companyId: string;
  status?: string;
  supplierId?: string;
  category?: string;
  periodFrom: string;
  periodTo: string;
}): Promise<Result<PayablesReportData>> {
  const [entriesResult, suppliersResult] = await Promise.all([
    listFinancialEntries({
      companyId: params.companyId,
      entryType: FINANCIAL_ENTRY_TYPES.payable,
      status: params.status,
      periodFrom: params.periodFrom,
      periodTo: params.periodTo,
    }),
    listSuppliers({ companyId: params.companyId, status: "active" }),
  ]);

  if (entriesResult.error || !entriesResult.data) {
    return {
      data: null,
      error:
        entriesResult.error ?? { message: "Erro ao carregar o relatório." },
    };
  }

  const entries = filterFinanceEntriesBySupplier(
    filterFinanceEntriesByCategory(
      entriesResult.data,
      params.category ?? "all"
    ),
    params.supplierId ?? "all"
  );

  return {
    data: {
      entries,
      suppliers: suppliersResult.data ?? [],
      kpis: buildPayablesReportKpis(entries),
      series: buildPayablesReportSeries(
        entries,
        params.periodFrom,
        params.periodTo
      ),
    },
    error: null,
  };
}

export async function getStockReport(params: {
  companyId: string;
  productId?: string;
  category?: string;
  situation?: string;
  periodFrom: string;
  periodTo: string;
}): Promise<Result<StockReportData>> {
  const supabase = createClient();
  const productId =
    params.productId && params.productId !== "all"
      ? params.productId
      : undefined;

  const [productsResult, movementsResult, optionsResult, lastMovementsResult] =
    await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("company_id", params.companyId)
        .eq("tracks_stock", true)
        .order("name", { ascending: true }),
      listStockMovements({
        companyId: params.companyId,
        productId,
        periodFrom: params.periodFrom,
        periodTo: params.periodTo,
      }),
      listProductFilterOptions(params.companyId),
      supabase
        .from("stock_movements")
        .select("product_id, movement_date")
        .eq("company_id", params.companyId)
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  if (productsResult.error) {
    return {
      data: null,
      error: { message: productsResult.error.message },
    };
  }

  if (movementsResult.error || !movementsResult.data) {
    return {
      data: null,
      error:
        movementsResult.error ?? {
          message: "Erro ao carregar o relatório de estoque.",
        },
    };
  }

  if (lastMovementsResult.error) {
    return {
      data: null,
      error: { message: lastMovementsResult.error.message },
    };
  }

  const allProducts = (productsResult.data ?? []) as Product[];
  const products = filterStockProducts(allProducts, {
    productId: params.productId,
    category: params.category,
    situation: params.situation,
  });

  const productIds = new Set(products.map((product) => product.id));
  const categoryOrSituationFiltered =
    (params.category && params.category !== "all") ||
    (params.situation && params.situation !== "all");

  const movements = categoryOrSituationFiltered
    ? filterStockMovementsByProductIds(movementsResult.data, productIds)
    : movementsResult.data;

  const lastMovementByProductId = new Map<string, string>();
  for (const row of (lastMovementsResult.data ?? []) as Array<{
    product_id: string;
    movement_date: string;
  }>) {
    if (!lastMovementByProductId.has(row.product_id)) {
      lastMovementByProductId.set(row.product_id, row.movement_date);
    }
  }

  const rows = buildStockReportRows(products, lastMovementByProductId);

  return {
    data: {
      products: allProducts,
      rows,
      movements,
      categories: optionsResult.data?.categories ?? [],
      kpis: buildStockReportKpis(products, movements),
      series: buildStockReportSeries(
        movements,
        params.periodFrom,
        params.periodTo
      ),
      lowBalanceSeries: buildStockLowBalanceSeries(products),
    },
    error: null,
  };
}
