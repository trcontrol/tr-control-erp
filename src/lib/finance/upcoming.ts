import {
  FINANCIAL_ENTRY_TYPES,
  FINANCIAL_STATUS,
} from "@/lib/constants";
import {
  todayISODate,
  toNumberAmount,
} from "@/lib/finance/format";
import type { FinancialEntryWithRelations } from "@/lib/finance/entry-query";

/** Janela padrão do card (hoje → hoje+N, inclusive). */
export const UPCOMING_RECEIVABLES_DEFAULT_WINDOW = 30;

/** Máximo de linhas no preview do card. */
export const UPCOMING_RECEIVABLES_PREVIEW_LIMIT = 5;

/** @deprecated use UPCOMING_RECEIVABLES_DEFAULT_WINDOW */
export const UPCOMING_RECEIVABLES_WINDOW_DAYS =
  UPCOMING_RECEIVABLES_DEFAULT_WINDOW;

export type UpcomingReceivablesWindow = 7 | 15 | 30 | 60 | "all";

export const UPCOMING_RECEIVABLES_WINDOW_OPTIONS: ReadonlyArray<{
  value: UpcomingReceivablesWindow;
  label: string;
}> = [
  { value: 7, label: "7 dias" },
  { value: 15, label: "15 dias" },
  { value: 30, label: "30 dias" },
  { value: 60, label: "60 dias" },
  { value: "all", label: "Todos" },
];

export function addDaysISO(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Janela de recebíveis futuros.
 * - N dias: [hoje, hoje+N] inclusive
 * - all: from=hoje, sem periodTo (só futuros; vencidos ficam de fora)
 */
export function upcomingReceivablesPeriod(
  window: UpcomingReceivablesWindow = UPCOMING_RECEIVABLES_DEFAULT_WINDOW,
  asOf = todayISODate()
): { periodFrom: string; periodTo?: string } {
  if (window === "all") {
    return { periodFrom: asOf };
  }
  return {
    periodFrom: asOf,
    periodTo: addDaysISO(asOf, window),
  };
}

export function upcomingReceivablesTitle(
  window: UpcomingReceivablesWindow
): string {
  if (window === "all") {
    return "Valores a receber futuros";
  }
  return `Valores a receber nos próximos ${window} dias`;
}

export function upcomingReceivablesEmptyMessage(
  window: UpcomingReceivablesWindow
): string {
  if (window === "all") {
    return "Nenhum recebível aberto futuro.";
  }
  return `Nenhum recebível aberto nos próximos ${window} dias.`;
}

/**
 * Parcela estruturada a partir de installment_number / installment_count.
 * Não usa descrição.
 */
export function installmentLabel(
  entry: Pick<
    FinancialEntryWithRelations,
    "installment_number" | "installment_count"
  >
): string {
  const number = entry.installment_number;
  const count = entry.installment_count;
  if (
    number == null ||
    count == null ||
    !Number.isFinite(Number(number)) ||
    !Number.isFinite(Number(count))
  ) {
    return "—";
  }
  return `${Number(number)}/${Number(count)}`;
}

export function receivablePartyLabel(
  entry: Pick<
    FinancialEntryWithRelations,
    "party_name" | "customer" | "supplier"
  >
): string {
  return (
    entry.party_name ||
    entry.customer?.full_name ||
    entry.supplier?.full_name ||
    "—"
  );
}

/**
 * Recebíveis futuros abertos: pending + due_date >= hoje.
 * Exclui overdue, received, paid, cancelled.
 */
export function filterUpcomingReceivables(
  entries: FinancialEntryWithRelations[],
  asOf = todayISODate()
): FinancialEntryWithRelations[] {
  return entries
    .filter(
      (entry) =>
        entry.entry_type === FINANCIAL_ENTRY_TYPES.receivable &&
        entry.status === FINANCIAL_STATUS.pending &&
        entry.due_date >= asOf
    )
    .sort((a, b) => {
      if (a.due_date !== b.due_date) {
        return a.due_date.localeCompare(b.due_date);
      }
      return a.id.localeCompare(b.id);
    });
}

export function sumEntryAmounts(entries: FinancialEntryWithRelations[]) {
  const cents = entries.reduce(
    (sum, entry) => sum + Math.round(toNumberAmount(entry.amount) * 100),
    0
  );
  return cents / 100;
}
