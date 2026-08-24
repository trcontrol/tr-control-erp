import {
  PRODUCT_TYPE_MAX_LENGTH,
  PRODUCT_TYPE_OPTIONS,
} from "@/lib/constants";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  toNumberAmount,
} from "@/lib/finance/format";

export {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  toNumberAmount,
};

/**
 * Display de product_type:
 * product → Produto, service → Serviço, demais → texto cru.
 * Não força fallback para "Produto" quando o valor é custom/vazio tratado.
 */
export function formatProductType(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "—";

  const legacy = PRODUCT_TYPE_OPTIONS.find((item) => item.value === trimmed);
  return legacy?.label ?? trimmed;
}

export function normalizeProductTypeInput(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function validateProductTypeInput(value: string | null | undefined): {
  value: string;
  error: string | null;
} {
  const normalized = normalizeProductTypeInput(value);

  if (!normalized) {
    return { value: "", error: "Campo obrigatório" };
  }

  if (normalized.length > PRODUCT_TYPE_MAX_LENGTH) {
    return {
      value: normalized,
      error: `Máximo de ${PRODUCT_TYPE_MAX_LENGTH} caracteres`,
    };
  }

  return { value: normalized, error: null };
}

export function calculateProfitMargin(
  costPrice: number | string | null | undefined,
  salePrice: number | string | null | undefined
) {
  const cost = toNumberAmount(costPrice ?? 0);
  const sale = toNumberAmount(salePrice ?? 0);

  if (sale <= 0) return null;

  return ((sale - cost) / sale) * 100;
}

export function formatPercent(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";

  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function parseStockInput(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return 0;

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : NaN;
}

export function formatStockInput(value: number | string | null | undefined) {
  if (value == null || value === "") return "";
  const amount = toNumberAmount(value);
  return String(amount).replace(".", ",");
}

export function isLowStock(product: {
  current_stock: number | string;
  min_stock: number | string;
  tracks_stock?: boolean | null;
}) {
  if (product.tracks_stock === false) return false;
  return toNumberAmount(product.current_stock) < toNumberAmount(product.min_stock);
}

export function formatStockQuantity(
  quantity: number | string | null | undefined,
  unit?: string | null
) {
  const amount = toNumberAmount(quantity ?? 0);
  const unitLabel = unit?.trim();
  return unitLabel ? `${amount} ${unitLabel}` : String(amount);
}

export function amountToCurrencyInput(value: number | string | null | undefined) {
  const amount = toNumberAmount(value ?? 0);
  return formatCurrencyInput(String(Math.round(amount * 100)));
}
