import {
  STOCK_MOVEMENT_TYPE_OPTIONS,
  type StockMovementType,
} from "@/lib/constants";
import {
  formatCurrency,
  formatStockQuantity,
  toNumberAmount,
} from "@/lib/products/format";

export { formatCurrency, formatStockQuantity, toNumberAmount };

export function stockMovementTypeLabel(type: string) {
  return (
    STOCK_MOVEMENT_TYPE_OPTIONS.find((item) => item.value === type)?.label ??
    type
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

export function formatSignedQuantity(
  delta: number | string | null | undefined,
  unit?: string | null
) {
  const amount = toNumberAmount(delta ?? 0);
  const sign = amount > 0 ? "+" : "";
  const formatted = `${sign}${amount}`;
  const unitLabel = unit?.trim();
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

export function movementTypeTone(type: string) {
  switch (type as StockMovementType) {
    case "entry":
      return "text-emerald-700";
    case "exit":
      return "text-destructive";
    case "adjustment":
      return "text-amber-700";
    case "inventory":
      return "text-sky-700";
    default:
      return "text-foreground";
  }
}
