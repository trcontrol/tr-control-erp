import { formatPhone, formatZipCode } from "@/lib/companies/format";
import type {
  CnpjCompanyData,
  CnpjFillableFormFields,
} from "@/lib/cnpj/types";

const FILLABLE_KEYS: (keyof CnpjFillableFormFields)[] = [
  "full_name",
  "trade_name",
  "secondary_document",
  "email",
  "phone",
  "zip_code",
  "street",
  "number",
  "complement",
  "neighborhood",
  "city",
  "state",
];

export function buildCnpjFormValues(
  data: CnpjCompanyData
): Partial<CnpjFillableFormFields> {
  const values: Partial<CnpjFillableFormFields> = {};

  if (data.legalName) values.full_name = data.legalName;
  if (data.tradeName) values.trade_name = data.tradeName;
  if (data.stateRegistration) {
    values.secondary_document = data.stateRegistration;
  }
  if (data.email) values.email = data.email;
  if (data.phone) values.phone = formatPhone(data.phone);
  if (data.zipCode) values.zip_code = formatZipCode(data.zipCode);
  if (data.street) values.street = data.street;
  if (data.number) values.number = data.number;
  if (data.complement) values.complement = data.complement;
  if (data.neighborhood) values.neighborhood = data.neighborhood;
  if (data.city) values.city = data.city;
  if (data.state) values.state = data.state;

  return values;
}

function isFilled(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function getCnpjConflictKeys(
  current: CnpjFillableFormFields,
  incoming: Partial<CnpjFillableFormFields>
): (keyof CnpjFillableFormFields)[] {
  return FILLABLE_KEYS.filter((key) => {
    const next = incoming[key];
    if (!isFilled(next)) return false;
    const existing = current[key];
    if (!isFilled(existing)) return false;
    return existing.trim() !== next!.trim();
  });
}

/**
 * Preenche campos vazios. Se `overwrite` for true, também substitui campos
 * já preenchidos quando a consulta trouxe valor.
 */
export function mergeCnpjFormFields<T extends CnpjFillableFormFields>(
  current: T,
  incoming: Partial<CnpjFillableFormFields>,
  overwrite: boolean
): T {
  const next = { ...current };

  for (const key of FILLABLE_KEYS) {
    const value = incoming[key];
    if (!isFilled(value)) continue;

    if (overwrite || !isFilled(current[key])) {
      next[key] = value as T[typeof key];
    }
  }

  return next;
}

export function formatCnpjOpeningDate(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatCnpjConsultedAt(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
