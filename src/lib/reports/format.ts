import { SALE_STATUS } from "@/lib/constants";
import {
  currentMonthPeriod,
  dayBucketLabel,
  formatCurrency,
  formatDateBR,
  monthBucketLabel,
  toNumberAmount,
} from "@/lib/dashboard/format";
import { saleStatusLabel } from "@/lib/sales/format";
import type { SaleListItem } from "@/lib/sales/actions";

export {
  currentMonthPeriod,
  dayBucketLabel,
  formatCurrency,
  formatDateBR,
  monthBucketLabel,
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

export type SalesReportSeriesPoint = {
  bucket: string;
  total: number;
  count: number;
};

export function customerLabel(
  customer: { full_name: string; trade_name?: string | null } | null | undefined
) {
  if (!customer) return "—";
  return customer.trade_name?.trim() || customer.full_name || "—";
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

function monthBucketFromDate(isoDate: string) {
  return isoDate.slice(0, 7) + "-01";
}

export function buildSalesReportSeries(
  sales: SaleListItem[],
  periodFrom: string,
  periodTo: string
): SalesReportSeriesPoint[] {
  const from = new Date(`${periodFrom}T00:00:00`);
  const to = new Date(`${periodTo}T00:00:00`);
  const spanDays =
    Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())
      ? 31
      : Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;

  const useDaily = spanDays > 0 && spanDays <= 45;
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
