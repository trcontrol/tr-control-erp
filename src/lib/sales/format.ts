import { SALE_STATUS_OPTIONS } from "@/lib/constants";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  toNumberAmount,
} from "@/lib/finance/format";
import { formatStockInput, parseStockInput } from "@/lib/products/format";

export {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  toNumberAmount,
  formatStockInput,
  parseStockInput,
};

export function saleStatusLabel(status: string) {
  return (
    SALE_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
  );
}

export function formatDateBR(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function formatDateTimeBR(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

export function todayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calcLineTotal(
  quantity: number,
  unitPrice: number,
  discountAmount: number
) {
  const total = quantity * unitPrice - discountAmount;
  return total < 0 ? 0 : Number(total.toFixed(2));
}

export function calcSaleTotal(
  itemsSubtotal: number,
  discountAmount: number,
  freightAmount: number
) {
  const total = itemsSubtotal - discountAmount + freightAmount;
  return total < 0 ? 0 : Number(total.toFixed(2));
}

export function paymentMethodLabel(
  value: string | null | undefined,
  options: readonly { value: string; label: string }[]
) {
  if (!value) return "—";
  return options.find((item) => item.value === value)?.label ?? value;
}
