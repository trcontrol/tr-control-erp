import { listCustomers } from "@/lib/customers/actions";
import { listPurchases, type PurchaseListItem } from "@/lib/purchases/actions";
import { listSales, type SaleListItem } from "@/lib/sales/actions";
import { listSuppliers } from "@/lib/suppliers/actions";
import type { Customer, Supplier } from "@/types/database";
import {
  buildPurchasesReportKpis,
  buildPurchasesReportSeries,
  buildSalesReportKpis,
  buildSalesReportSeries,
  type PurchasesReportKpis,
  type PurchasesReportSeriesPoint,
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
