import { CNPJ_MESSAGES } from "@/lib/cnpj/messages";
import type {
  CnpjCompanyData,
  CnpjProvider,
  CnpjProviderLookupResult,
} from "@/lib/cnpj/types";

const DEFAULT_TIMEOUT_MS = 10_000;

export const CNPJ_REQUEST_HEADERS = {
  Accept: "application/json",
  "User-Agent": "TR-Control-ERP/0.1.0",
  "Cache-Control": "no-cache",
} as const;

type BrasilApiCnpjResponse = {
  cnpj?: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  descricao_situacao_cadastral?: string | null;
  data_inicio_atividade?: string | null;
  cnae_fiscal?: number | string | null;
  cnae_fiscal_descricao?: string | null;
  cep?: string | null;
  descricao_tipo_de_logradouro?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  ddd_telefone_1?: string | null;
  email?: string | null;
};

type CnpjWsEstabelecimento = {
  cnpj?: string | null;
  nome_fantasia?: string | null;
  situacao_cadastral?: string | null;
  data_inicio_atividade?: string | null;
  tipo_logradouro?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  ddd1?: string | null;
  telefone1?: string | null;
  email?: string | null;
  cidade?: { nome?: string | null } | null;
  estado?: { sigla?: string | null } | null;
  atividade_principal?: {
    id?: string | null;
    descricao?: string | null;
  } | null;
  inscricoes_estaduais?: Array<{
    inscricao_estadual?: string | null;
    ativo?: boolean | null;
  }> | null;
};

type CnpjWsResponse = {
  razao_social?: string | null;
  estabelecimento?: CnpjWsEstabelecimento | null;
  detalhe?: string | null;
  titulo?: string | null;
};

function asTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asDigits(value: unknown): string | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function buildStreet(
  type: string | null,
  logradouro: string | null
): string | null {
  if (!logradouro) return null;
  if (!type) return logradouro;
  const alreadyPrefixed = logradouro
    .toLowerCase()
    .startsWith(type.toLowerCase());
  return alreadyPrefixed ? logradouro : `${type} ${logradouro}`;
}

function buildMainCnae(
  code: number | string | null | undefined,
  description: string | null
): string | null {
  const codeText =
    code == null || code === ""
      ? null
      : String(code).replace(/\D/g, "") || String(code).trim();
  if (codeText && description) return `${codeText} — ${description}`;
  if (description) return description;
  if (codeText) return codeText;
  return null;
}

function failureFromHttpStatus(
  status: number,
  fallbackMessage = CNPJ_MESSAGES.unavailable
): CnpjProviderLookupResult {
  if (status === 404) {
    return {
      ok: false,
      httpStatus: status,
      code: "not_found",
      message: CNPJ_MESSAGES.notFound,
    };
  }

  if (status === 429) {
    return {
      ok: false,
      httpStatus: status,
      code: "rate_limited",
      message: CNPJ_MESSAGES.rateLimited,
    };
  }

  return {
    ok: false,
    httpStatus: status,
    code: "unavailable",
    message: fallbackMessage,
  };
}

async function fetchProviderJson(
  url: string,
  signal?: AbortSignal
): Promise<
  | { ok: true; status: number; payload: unknown }
  | { ok: false; status: number | null; isTimeout: boolean }
> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: CNPJ_REQUEST_HEADERS,
      signal,
      cache: "no-store",
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return { ok: true, status: response.status, payload };
  } catch (error) {
    const isTimeout =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");

    return { ok: false, status: null, isTimeout };
  }
}

function normalizeBrasilApiPayload(
  payload: BrasilApiCnpjResponse,
  requestedCnpj: string
): CnpjCompanyData | null {
  const legalName = asTrimmed(payload.razao_social);
  if (!legalName) return null;

  return {
    cnpj: asDigits(payload.cnpj) ?? requestedCnpj,
    legalName,
    tradeName: asTrimmed(payload.nome_fantasia),
    registrationStatus: asTrimmed(payload.descricao_situacao_cadastral),
    openingDate: asTrimmed(payload.data_inicio_atividade),
    mainCnae: buildMainCnae(
      payload.cnae_fiscal,
      asTrimmed(payload.cnae_fiscal_descricao)
    ),
    stateRegistration: null,
    zipCode: asDigits(payload.cep),
    street: buildStreet(
      asTrimmed(payload.descricao_tipo_de_logradouro),
      asTrimmed(payload.logradouro)
    ),
    number: asTrimmed(payload.numero),
    complement: asTrimmed(payload.complemento),
    neighborhood: asTrimmed(payload.bairro),
    city: asTrimmed(payload.municipio),
    state: asTrimmed(payload.uf)?.toUpperCase() ?? null,
    phone: asDigits(payload.ddd_telefone_1),
    email: asTrimmed(payload.email)?.toLowerCase() ?? null,
  };
}

function pickStateRegistration(
  items: CnpjWsEstabelecimento["inscricoes_estaduais"]
): string | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  const active = items.find(
    (item) => item?.ativo !== false && asTrimmed(item?.inscricao_estadual)
  );
  const chosen = active ?? items[0];
  return asTrimmed(chosen?.inscricao_estadual);
}

function normalizeCnpjWsPayload(
  payload: CnpjWsResponse,
  requestedCnpj: string
): CnpjCompanyData | null {
  const establishment = payload.estabelecimento;
  const legalName = asTrimmed(payload.razao_social);
  if (!legalName || !establishment) return null;

  const ddd = asDigits(establishment.ddd1);
  const phoneNumber = asDigits(establishment.telefone1);
  const phone =
    ddd && phoneNumber ? `${ddd}${phoneNumber}` : phoneNumber ?? ddd;

  const activity = establishment.atividade_principal;

  return {
    cnpj: asDigits(establishment.cnpj) ?? requestedCnpj,
    legalName,
    tradeName: asTrimmed(establishment.nome_fantasia),
    registrationStatus: asTrimmed(establishment.situacao_cadastral),
    openingDate: asTrimmed(establishment.data_inicio_atividade),
    mainCnae: buildMainCnae(
      activity?.id ?? null,
      asTrimmed(activity?.descricao ?? null)
    ),
    stateRegistration: pickStateRegistration(
      establishment.inscricoes_estaduais
    ),
    zipCode: asDigits(establishment.cep),
    street: buildStreet(
      asTrimmed(establishment.tipo_logradouro),
      asTrimmed(establishment.logradouro)
    ),
    number: asTrimmed(establishment.numero),
    complement: asTrimmed(establishment.complemento),
    neighborhood: asTrimmed(establishment.bairro),
    city: asTrimmed(establishment.cidade?.nome ?? null),
    state: asTrimmed(establishment.estado?.sigla ?? null)?.toUpperCase() ?? null,
    phone,
    email: asTrimmed(establishment.email)?.toLowerCase() ?? null,
  };
}

/**
 * Provedor principal (desenvolvimento/testes).
 * Substituível pela API oficial Consulta CNPJ do Serpro no futuro.
 */
export class BrasilApiCnpjProvider implements CnpjProvider {
  readonly name = "BrasilAPI";

  async lookup(
    cnpjDigits: string,
    signal?: AbortSignal
  ): Promise<CnpjProviderLookupResult> {
    const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`;
    const fetched = await fetchProviderJson(url, signal);

    if (!fetched.ok) {
      return {
        ok: false,
        httpStatus: null,
        code: "unavailable",
        message: CNPJ_MESSAGES.unavailable,
        isTimeout: fetched.isTimeout,
      };
    }

    if (!fetched.status || fetched.status < 200 || fetched.status >= 300) {
      return failureFromHttpStatus(fetched.status);
    }

    if (!fetched.payload || typeof fetched.payload !== "object") {
      return {
        ok: false,
        httpStatus: fetched.status,
        code: "unavailable",
        message: CNPJ_MESSAGES.unavailable,
      };
    }

    const data = normalizeBrasilApiPayload(
      fetched.payload as BrasilApiCnpjResponse,
      cnpjDigits
    );

    if (!data) {
      return {
        ok: false,
        httpStatus: fetched.status,
        code: "unavailable",
        message: CNPJ_MESSAGES.unavailable,
      };
    }

    return { ok: true, data, httpStatus: fetched.status };
  }
}

/**
 * Fallback: API pública CNPJ.ws.
 * Usar apenas após 403, 5xx ou timeout da BrasilAPI.
 * Limite: 3 consultas/minuto/IP (controlado em rate-limit.ts).
 */
export class CnpjWsPublicProvider implements CnpjProvider {
  readonly name = "CNPJ.ws";

  async lookup(
    cnpjDigits: string,
    signal?: AbortSignal
  ): Promise<CnpjProviderLookupResult> {
    const url = `https://publica.cnpj.ws/cnpj/${cnpjDigits}`;
    const fetched = await fetchProviderJson(url, signal);

    if (!fetched.ok) {
      return {
        ok: false,
        httpStatus: null,
        code: "unavailable",
        message: CNPJ_MESSAGES.unavailable,
        isTimeout: fetched.isTimeout,
      };
    }

    if (!fetched.status || fetched.status < 200 || fetched.status >= 300) {
      return failureFromHttpStatus(fetched.status);
    }

    if (!fetched.payload || typeof fetched.payload !== "object") {
      return {
        ok: false,
        httpStatus: fetched.status,
        code: "unavailable",
        message: CNPJ_MESSAGES.unavailable,
      };
    }

    const data = normalizeCnpjWsPayload(
      fetched.payload as CnpjWsResponse,
      cnpjDigits
    );

    if (!data) {
      return {
        ok: false,
        httpStatus: fetched.status,
        code: "unavailable",
        message: CNPJ_MESSAGES.unavailable,
      };
    }

    return { ok: true, data, httpStatus: fetched.status };
  }
}

/**
 * Placeholder para a API oficial Consulta CNPJ do Serpro.
 * Não implementado nesta etapa — credenciais apenas em variáveis de servidor.
 */
export class SerproCnpjProvider implements CnpjProvider {
  readonly name = "Serpro Consulta CNPJ";

  async lookup(): Promise<CnpjProviderLookupResult> {
    return {
      ok: false,
      httpStatus: null,
      code: "unavailable",
      message:
        "Provedor Serpro ainda não configurado. Use BrasilAPI em desenvolvimento.",
    };
  }
}

export function getCnpjLookupTimeoutMs() {
  const raw = process.env.CNPJ_LOOKUP_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : DEFAULT_TIMEOUT_MS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export function getPrimaryCnpjProvider(): CnpjProvider {
  const provider = (process.env.CNPJ_PROVIDER ?? "brasilapi").toLowerCase();
  if (provider === "serpro") {
    return new SerproCnpjProvider();
  }
  return new BrasilApiCnpjProvider();
}

export function getFallbackCnpjProvider(): CnpjProvider {
  return new CnpjWsPublicProvider();
}

export function shouldTryCnpjFallback(
  result: CnpjProviderLookupResult
): boolean {
  if (result.ok) return false;
  if (result.isTimeout) return true;
  if (result.httpStatus === 403) return true;
  if (result.httpStatus != null && result.httpStatus >= 500) return true;
  return false;
}

export function logCnpjProviderStatus(
  providerName: string,
  status: number | "timeout" | "skipped" | "error"
) {
  console.info(`[cnpj] provider=${providerName} status=${status}`);
}
