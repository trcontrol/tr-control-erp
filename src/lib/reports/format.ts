import {
  FINANCIAL_ENTRY_TYPES,
  FINANCIAL_ENTRY_TYPE_OPTIONS,
  FINANCIAL_STATUS,
  FINANCIAL_STATUS_OPTIONS,
  PURCHASE_STATUS,
  SALE_STATUS,
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
import { purchaseStatusLabel } from "@/lib/purchases/format";
import { saleStatusLabel } from "@/lib/sales/format";
import type { PurchaseListItem } from "@/lib/purchases/actions";
import type { SaleListItem } from "@/lib/sales/actions";

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

export function receivablePartyLabel(entry: FinancialEntryWithRelations) {
  const linked = customerLabel(entry.customer);
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
