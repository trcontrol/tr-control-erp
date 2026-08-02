import { listCustomers } from "@/lib/customers/actions";
import { listSales, type SaleListItem } from "@/lib/sales/actions";
import type { Customer } from "@/types/database";
import {
  buildSalesReportKpis,
  buildSalesReportSeries,
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
