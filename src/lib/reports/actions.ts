import { FINANCIAL_ENTRY_TYPES } from "@/lib/constants";
import { listCustomers } from "@/lib/customers/actions";
import {
  listFinancialEntries,
  type FinancialEntryWithRelations,
} from "@/lib/finance/actions";
import { listPurchases, type PurchaseListItem } from "@/lib/purchases/actions";
import { listSales, type SaleListItem } from "@/lib/sales/actions";
import { listSuppliers } from "@/lib/suppliers/actions";
import type { Customer, Supplier } from "@/types/database";
import {
  buildFinanceReportKpis,
  buildFinanceReportSeries,
  buildPurchasesReportKpis,
  buildPurchasesReportSeries,
  buildReceivablesReportKpis,
  buildReceivablesReportSeries,
  buildSalesReportKpis,
  buildSalesReportSeries,
  filterFinanceEntriesByCategory,
  filterFinanceEntriesByCustomer,
  type FinanceReportKpis,
  type FinanceReportSeriesPoint,
  type PurchasesReportKpis,
  type PurchasesReportSeriesPoint,
  type ReceivablesReportKpis,
  type ReceivablesReportSeriesPoint,
  type SalesReportKpis,
  type SalesReportSeriesPoint,
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
