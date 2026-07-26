import {
  CASH_FLOW_ORIGIN_OPTIONS,
  FINANCIAL_STATUS_OPTIONS,
  PAYMENT_METHODS,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDateBR,
  toNumberAmount,
  todayISODate,
} from "@/lib/finance/format";

export { formatCurrency, formatDateBR, toNumberAmount, todayISODate };

export function originLabel(origin: string | null | undefined) {
  if (!origin) return "Lançamento manual";
  return (
    CASH_FLOW_ORIGIN_OPTIONS.find((item) => item.value === origin)?.label ??
    "Outro"
  );
}

export function paymentMethodLabel(value: string | null | undefined) {
  if (!value) return "—";
  return PAYMENT_METHODS.find((item) => item.value === value)?.label ?? value;
}

export function statusLabel(status: string | null | undefined) {
  if (!status) return "—";
  return (
    FINANCIAL_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

export function startOfMonthISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function endOfMonthISO(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function addDaysISO(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultRealizedPeriod() {
  return {
    from: startOfMonthISO(),
    to: endOfMonthISO(),
  };
}

export function defaultProjectedPeriod() {
  const from = todayISODate();
  return {
    from,
    to: addDaysISO(from, 30),
  };
}
