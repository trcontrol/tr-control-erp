import { PERSON_TYPES, type PersonType } from "@/lib/constants";
import {
  formatDocument,
  formatPhone,
  formatZipCode,
  isValidDocument,
  isValidEmail,
  onlyDigits,
} from "@/lib/customers/format";
import type { CustomerInsert } from "@/types/database";

export type CustomerValidationInput = {
  person_type?: string | null;
  full_name?: string | null;
  trade_name?: string | null;
  document?: string | null;
  secondary_document?: string | null;
  birth_date?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  zip_code?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  status?: string | null;
};

export type CustomerFieldErrors = Partial<
  Record<keyof CustomerValidationInput, string>
>;

function normalizePersonType(value?: string | null): PersonType | null {
  if (value === PERSON_TYPES.company) return PERSON_TYPES.company;
  if (value === PERSON_TYPES.individual) return PERSON_TYPES.individual;
  return null;
}

/**
 * Validação compartilhada (UI + actions).
 * document opcional; se preenchido, valida CPF/CNPJ conforme o tipo.
 */
export function validateCustomerPayload(
  input: CustomerValidationInput
): { ok: true } | { ok: false; message: string; fields: CustomerFieldErrors } {
  const fields: CustomerFieldErrors = {};
  const personType = normalizePersonType(input.person_type);

  if (!personType) {
    fields.person_type = "Selecione o tipo de pessoa.";
  }

  if (!input.full_name?.trim()) {
    fields.full_name = "Campo obrigatório";
  }

  const documentRaw = input.document?.trim() ?? "";
  if (documentRaw) {
    if (!personType || !isValidDocument(documentRaw, personType)) {
      fields.document =
        personType === PERSON_TYPES.company ? "CNPJ inválido" : "CPF inválido";
    }
  }

  const email = input.email?.trim() ?? "";
  if (email && !isValidEmail(email)) {
    fields.email = "E-mail inválido";
  }

  const zip = input.zip_code?.trim() ?? "";
  if (zip && onlyDigits(zip).length !== 8) {
    fields.zip_code = "CEP deve ter 8 dígitos";
  }

  if (Object.keys(fields).length > 0) {
    const message =
      fields.document && !fields.full_name && !fields.person_type
        ? fields.document
        : "Preencha os campos obrigatórios corretamente.";
    return { ok: false, message, fields };
  }

  return { ok: true };
}

/** Normaliza payload para persistência (sem mudar máscara do documento). */
export function normalizeCustomerPayload(
  input: CustomerValidationInput & { company_id: string }
): CustomerInsert {
  const personType =
    normalizePersonType(input.person_type) ?? PERSON_TYPES.individual;
  const isCompany = personType === PERSON_TYPES.company;
  const documentRaw = input.document?.trim() ?? "";

  return {
    company_id: input.company_id,
    person_type: personType,
    full_name: (input.full_name ?? "").trim(),
    trade_name: isCompany
      ? input.trade_name?.trim() || null
      : null,
    document: documentRaw
      ? formatDocument(documentRaw, personType)
      : null,
    secondary_document: input.secondary_document?.trim() || null,
    birth_date: isCompany ? null : input.birth_date || null,
    email: input.email?.trim().toLowerCase() || null,
    phone: input.phone ? formatPhone(input.phone) : null,
    whatsapp: input.whatsapp ? formatPhone(input.whatsapp) : null,
    zip_code: input.zip_code ? formatZipCode(input.zip_code) : null,
    street: input.street?.trim() || null,
    number: input.number?.trim() || null,
    complement: input.complement?.trim() || null,
    neighborhood: input.neighborhood?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state || null,
    notes: input.notes?.trim() || null,
    status: input.status || "active",
  };
}

export function mapCustomerPgError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("idx_customers_company_document_unique") ||
    (lower.includes("duplicate") && lower.includes("document")) ||
    (lower.includes("unique") && lower.includes("document"))
  ) {
    return "Já existe um cliente com este CPF/CNPJ nesta empresa.";
  }
  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "Já existe um cliente com estes dados nesta empresa.";
  }
  return message;
}
