import {
  endOfMonthISO,
  formatCurrency,
  formatDateBR,
  startOfMonthISO,
  toNumberAmount,
} from "@/lib/cash-flow/format";
import { formatStockQuantity } from "@/lib/stock/format";

export {
  endOfMonthISO,
  formatCurrency,
  formatDateBR,
  formatStockQuantity,
  startOfMonthISO,
  toNumberAmount,
};

export function currentMonthPeriod(date = new Date()) {
  return {
    from: startOfMonthISO(date),
    to: endOfMonthISO(date),
  };
}

export function monthBucketLabel(bucket: string) {
  return new Date(`${bucket}T00:00:00`).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

export function dayBucketLabel(bucket: string) {
  return new Date(`${bucket}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}
