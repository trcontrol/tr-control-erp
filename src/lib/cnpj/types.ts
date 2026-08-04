/**
 * Contrato de consulta de CNPJ.
 *
 * Provedor principal (desenvolvimento/testes): BrasilAPI.
 * Fallback: API pública CNPJ.ws (apenas em 403, 5xx ou timeout).
 * Provedor futuro previsto: API oficial Consulta CNPJ do Serpro.
 */

export type CnpjCompanyData = {
  cnpj: string;
  legalName: string | null;
  tradeName: string | null;
  registrationStatus: string | null;
  openingDate: string | null;
  mainCnae: string | null;
  stateRegistration: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
};

export type CnpjLookupErrorCode =
  | "invalid"
  | "not_found"
  | "unavailable"
  | "rate_limited";

export type CnpjLookupSuccess = {
  ok: true;
  data: CnpjCompanyData;
  source: string;
  consultedAt: string;
  partial: boolean;
};

export type CnpjLookupFailure = {
  ok: false;
  code: CnpjLookupErrorCode;
  message: string;
};

export type CnpjLookupResult = CnpjLookupSuccess | CnpjLookupFailure;

export type CnpjProviderLookupSuccess = {
  ok: true;
  data: CnpjCompanyData;
  httpStatus: number;
};

export type CnpjProviderLookupFailure = {
  ok: false;
  httpStatus: number | null;
  code: Exclude<CnpjLookupErrorCode, "invalid">;
  message: string;
  isTimeout?: boolean;
};

export type CnpjProviderLookupResult =
  | CnpjProviderLookupSuccess
  | CnpjProviderLookupFailure;

export interface CnpjProvider {
  /** Identificador exibido ao usuário (origem da consulta). */
  readonly name: string;
  lookup(
    cnpjDigits: string,
    signal?: AbortSignal
  ): Promise<CnpjProviderLookupResult>;
}

/** Campos do formulário preenchíveis pela consulta (Clientes / Fornecedores). */
export type CnpjFillableFormFields = {
  full_name: string;
  trade_name: string;
  secondary_document: string;
  email: string;
  phone: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};
