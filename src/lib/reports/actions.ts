import {
  FINANCIAL_ENTRY_TYPES,
  OPPORTUNITY_STATUS,
  SALE_STATUS,
} from "@/lib/constants";
import { listCustomers } from "@/lib/customers/actions";
import {
  queryFinancialEntries,
  type FinancialEntryWithRelations,
} from "@/lib/finance/entry-query";
import type { OpportunityWithRelations } from "@/lib/funnel/actions";
import { listProductFilterOptions } from "@/lib/products/actions";
import {
  queryPurchases,
  type PurchaseListItem,
} from "@/lib/purchases/purchase-query";
import {
  querySales,
  type SaleListItem,
} from "@/lib/sales/sale-query";
import {
  listStockMovements,
  type StockMovementWithRelations,
} from "@/lib/stock/actions";
import { listSuppliers } from "@/lib/suppliers/actions";
import {
  listCompanyMemberOptions,
  type CompanyMemberOption,
} from "@/lib/tasks/actions";
import { createClient } from "@/lib/supabase/client";
import type { Customer, Product, Supplier } from "@/types/database";
import {
  buildCustomerCityOptions,
  buildCustomerSalesAggMap,
  buildCustomerStateOptions,
  buildCustomersReportKpis,
  buildCustomersReportRows,
  buildCustomersReportSeries,
  buildCustomersSalesDistribution,
  buildFinanceReportKpis,
  buildFinanceReportSeries,
  buildFunnelCreatedSeries,
  buildFunnelLostSummary,
  buildFunnelReportKpis,
  buildFunnelReportRows,
  buildFunnelReportStages,
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
  filterCustomersForReport,
  filterFinanceEntriesByCategory,
  filterFinanceEntriesByCustomer,
  filterFinanceEntriesBySupplier,
  filterStockMovementsByProductIds,
  filterStockProducts,
  opportunityCreatedDate,
  type CustomersReportKpis,
  type CustomersReportRow,
  type CustomersReportSeriesPoint,
  type CustomersSalesDistributionPoint,
  type FinanceReportKpis,
  type FinanceReportSeriesPoint,
  type FunnelReportCreatedSeriesPoint,
  type FunnelReportKpis,
  type FunnelReportRow,
  type FunnelReportStageRow,
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

export type CustomersReportData = {
  rows: CustomersReportRow[];
  kpis: CustomersReportKpis;
  series: CustomersReportSeriesPoint[];
  salesDistribution: CustomersSalesDistributionPoint[];
  stateOptions: Array<{ value: string; label: string }>;
  cityOptions: Array<{ value: string; label: string }>;
};

export type FunnelReportData = {
  rows: FunnelReportRow[];
  kpis: FunnelReportKpis;
  stages: FunnelReportStageRow[];
  lostSummary: FunnelReportStageRow;
  createdSeries: FunnelReportCreatedSeriesPoint[];
  customers: Customer[];
  members: CompanyMemberOption[];
};

const FUNNEL_REPORT_SELECT = `
  *,
  customer:customers!opportunities_customer_id_fkey (
    id,
    full_name,
    trade_name
  ),
  assigned_user:profiles!opportunities_assigned_user_id_fkey (
    id,
    full_name
  ),
  created_by_user:profiles!opportunities_created_by_fkey (
    id,
    full_name
  )
`;

export async function getSalesReport(params: {
  companyId: string;
  status?: string;
  customerId?: string;
  periodFrom: string;
  periodTo: string;
}): Promise<Result<SalesReportData>> {
  const supabase = createClient();
  const [salesResult, customersResult] = await Promise.all([
    querySales(supabase, {
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
  const supabase = createClient();
  const [purchasesResult, suppliersResult] = await Promise.all([
    queryPurchases(supabase, {
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
  // Fase Reports: ainda sem assert de módulo reports/finance.
  // Usa query compartilhada no client (não passa pelo gate de finance/actions).
  const result = await queryFinancialEntries(createClient(), {
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
    queryFinancialEntries(createClient(), {
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
    queryFinancialEntries(createClient(), {
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

export async function getCustomersReport(params: {
  companyId: string;
  status?: string;
  personType?: string;
  state?: string;
  city?: string;
  periodFrom: string;
  periodTo: string;
}): Promise<Result<CustomersReportData>> {
  const supabase = createClient();
  const [customersResult, salesResult] = await Promise.all([
    listCustomers({
      companyId: params.companyId,
      status: params.status,
      personType: params.personType,
    }),
    querySales(supabase, {
      companyId: params.companyId,
      status: SALE_STATUS.confirmed,
    }),
  ]);

  if (customersResult.error) {
    return { data: null, error: customersResult.error };
  }

  if (salesResult.error) {
    return { data: null, error: salesResult.error };
  }

  const customers = customersResult.data ?? [];
  const sales = salesResult.data ?? [];
  const salesByCustomer = buildCustomerSalesAggMap(sales);

  const stateOptions = buildCustomerStateOptions(customers);
  const cityOptions = buildCustomerCityOptions(customers, params.state);

  const filtered = filterCustomersForReport(customers, {
    status: params.status,
    personType: params.personType,
    state: params.state,
    city: params.city,
  });

  const kpis = buildCustomersReportKpis(
    filtered,
    salesByCustomer,
    params.periodFrom,
    params.periodTo
  );

  return {
    data: {
      rows: buildCustomersReportRows(filtered, salesByCustomer),
      kpis,
      series: buildCustomersReportSeries(
        filtered,
        params.periodFrom,
        params.periodTo
      ),
      salesDistribution: buildCustomersSalesDistribution(kpis),
      stateOptions,
      cityOptions,
    },
    error: null,
  };
}

export async function getFunnelReport(params: {
  companyId: string;
  stage?: string;
  assignedUserId?: string;
  customerId?: string;
  periodFrom: string;
  periodTo: string;
}): Promise<Result<FunnelReportData>> {
  const supabase = createClient();

  const [opportunitiesResult, customersResult, membersResult] =
    await Promise.all([
      supabase
        .from("opportunities")
        .select(FUNNEL_REPORT_SELECT)
        .eq("company_id", params.companyId)
        .eq("status", OPPORTUNITY_STATUS.active)
        .order("created_at", { ascending: false }),
      listCustomers({ companyId: params.companyId, status: "active" }),
      listCompanyMemberOptions(params.companyId),
    ]);

  if (opportunitiesResult.error) {
    return {
      data: null,
      error: { message: opportunitiesResult.error.message },
    };
  }

  if (customersResult.error) {
    return { data: null, error: customersResult.error };
  }

  if (membersResult.error) {
    return { data: null, error: membersResult.error };
  }

  const stage = params.stage ?? "all";
  const assignedUserId = params.assignedUserId ?? "all";
  const customerId = params.customerId ?? "all";

  const opportunities = (
    (opportunitiesResult.data ?? []) as OpportunityWithRelations[]
  ).filter((opportunity) => {
    const created = opportunityCreatedDate(opportunity);
    if (created < params.periodFrom || created > params.periodTo) {
      return false;
    }
    if (stage !== "all" && opportunity.stage !== stage) return false;
    if (
      assignedUserId !== "all" &&
      opportunity.assigned_user_id !== assignedUserId
    ) {
      return false;
    }
    if (customerId !== "all" && opportunity.customer_id !== customerId) {
      return false;
    }
    return true;
  });

  const kpis = buildFunnelReportKpis(opportunities);

  return {
    data: {
      rows: buildFunnelReportRows(opportunities),
      kpis,
      stages: buildFunnelReportStages(opportunities),
      lostSummary: buildFunnelLostSummary(opportunities),
      createdSeries: buildFunnelCreatedSeries(
        opportunities,
        params.periodFrom,
        params.periodTo
      ),
      customers: customersResult.data ?? [],
      members: membersResult.data ?? [],
    },
    error: null,
  };
}
