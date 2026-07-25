import { FINANCIAL_STATUS } from "@/lib/constants";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function parseCurrencyInput(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : NaN;
}

export function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const amount = Number(digits) / 100;
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toNumberAmount(value: number | string) {
  const amount = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(amount) ? amount : 0;
}

export function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function isPastDate(date: string) {
  return date < todayISODate();
}

export function resolveEntryStatus(
  status: string,
  dueDate: string,
  entryType: string
) {
  if (
    status === FINANCIAL_STATUS.pending &&
    isPastDate(dueDate)
  ) {
    return FINANCIAL_STATUS.overdue;
  }

  if (
    status === FINANCIAL_STATUS.overdue &&
    !isPastDate(dueDate)
  ) {
    return FINANCIAL_STATUS.pending;
  }

  if (
    status === FINANCIAL_STATUS.paid &&
    entryType === "receivable"
  ) {
    return FINANCIAL_STATUS.received;
  }

  if (
    status === FINANCIAL_STATUS.received &&
    entryType === "payable"
  ) {
    return FINANCIAL_STATUS.paid;
  }

  return status;
}

export function formatDateBR(date?: string | null) {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}
