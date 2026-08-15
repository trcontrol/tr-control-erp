/**
 * Regras V1 de hard-delete de financial_entries.
 * Espelhadas na migration 031 (BEFORE DELETE).
 *
 * - originado purchase/sale → nunca excluir via Financeiro
 * - status paid/received → nunca excluir
 * - manual (ou sem origem) pending/overdue/cancelled → pode excluir
 */

export const FINANCIAL_DELETE_BLOCKED_SOURCE = [
  "purchase",
  "sale",
] as const;

export const FINANCIAL_DELETE_BLOCKED_STATUS = [
  "paid",
  "received",
] as const;

export const FINANCIAL_DELETE_MESSAGES = {
  sourced:
    "Não é possível excluir lançamentos originados de compra ou venda. Gerencie o ciclo de vida pela operação de origem.",
  settled:
    "Não é possível excluir um lançamento já pago ou recebido.",
} as const;

export type FinancialDeleteGuardInput = {
  status?: string | null;
  source_type?: string | null;
};

function normalizeSourceType(sourceType: string | null | undefined): string {
  return (sourceType ?? "").trim().toLowerCase();
}

export function isPurchaseOrSaleSourcedEntry(
  entry: FinancialDeleteGuardInput
): boolean {
  const source = normalizeSourceType(entry.source_type);
  return (
    source === "purchase" ||
    source === "sale"
  );
}

export function isSettledFinancialStatus(
  status: string | null | undefined
): boolean {
  const value = (status ?? "").trim().toLowerCase();
  return value === "paid" || value === "received";
}

/** Motivo de bloqueio, ou null se a exclusão for permitida pela regra V1. */
export function getFinancialEntryDeleteBlockReason(
  entry: FinancialDeleteGuardInput
): string | null {
  if (isPurchaseOrSaleSourcedEntry(entry)) {
    return FINANCIAL_DELETE_MESSAGES.sourced;
  }
  if (isSettledFinancialStatus(entry.status)) {
    return FINANCIAL_DELETE_MESSAGES.settled;
  }
  return null;
}

export function canHardDeleteFinancialEntry(
  entry: FinancialDeleteGuardInput
): boolean {
  return getFinancialEntryDeleteBlockReason(entry) === null;
}
