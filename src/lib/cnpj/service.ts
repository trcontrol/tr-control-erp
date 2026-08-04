import { isValidCnpj, onlyDigits } from "@/lib/companies/format";
import { CNPJ_MESSAGES } from "@/lib/cnpj/messages";
import {
  getCnpjLookupTimeoutMs,
  getFallbackCnpjProvider,
  getPrimaryCnpjProvider,
  logCnpjProviderStatus,
  shouldTryCnpjFallback,
} from "@/lib/cnpj/provider";
import { canCallCnpjWs, recordCnpjWsCall } from "@/lib/cnpj/rate-limit";
import type {
  CnpjCompanyData,
  CnpjLookupResult,
  CnpjProvider,
  CnpjProviderLookupResult,
} from "@/lib/cnpj/types";

/** Campos centrais: ausência deles justifica aviso de preenchimento manual. */
const CORE_FIELDS: (keyof CnpjCompanyData)[] = [
  "legalName",
  "zipCode",
  "street",
  "city",
  "state",
];

function isPartial(data: CnpjCompanyData) {
  return CORE_FIELDS.some((key) => {
    const value = data[key];
    return value == null || String(value).trim() === "";
  });
}

function toSuccess(
  data: CnpjCompanyData,
  source: string,
  cnpjDigits: string
): CnpjLookupResult {
  return {
    ok: true,
    data: {
      ...data,
      cnpj: onlyDigits(data.cnpj) || cnpjDigits,
    },
    source,
    consultedAt: new Date().toISOString(),
    partial: isPartial(data),
  };
}

function toFailure(result: CnpjProviderLookupResult): CnpjLookupResult {
  if (result.ok) {
    return {
      ok: false,
      code: "unavailable",
      message: CNPJ_MESSAGES.unavailable,
    };
  }

  return {
    ok: false,
    code: result.code,
    message: result.message,
  };
}

async function runProvider(
  provider: CnpjProvider,
  cnpjDigits: string,
  timeoutMs: number
): Promise<CnpjProviderLookupResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await provider.lookup(cnpjDigits, controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

function logAttempt(
  providerName: string,
  result: CnpjProviderLookupResult
) {
  if (result.ok) {
    logCnpjProviderStatus(providerName, result.httpStatus);
    return;
  }

  if (result.isTimeout) {
    logCnpjProviderStatus(providerName, "timeout");
    return;
  }

  logCnpjProviderStatus(providerName, result.httpStatus ?? "error");
}

export async function lookupCnpj(rawCnpj: string): Promise<CnpjLookupResult> {
  const cnpjDigits = onlyDigits(rawCnpj);

  if (cnpjDigits.length !== 14 || !isValidCnpj(cnpjDigits)) {
    return {
      ok: false,
      code: "invalid",
      message: CNPJ_MESSAGES.invalid,
    };
  }

  const timeoutMs = getCnpjLookupTimeoutMs();
  const primary = getPrimaryCnpjProvider();
  const primaryResult = await runProvider(primary, cnpjDigits, timeoutMs);
  logAttempt(primary.name, primaryResult);

  if (primaryResult.ok) {
    return toSuccess(primaryResult.data, primary.name, cnpjDigits);
  }

  // 404 / 429 do principal: não tenta fallback e não repete a consulta.
  if (
    primaryResult.code === "not_found" ||
    primaryResult.code === "rate_limited"
  ) {
    return toFailure(primaryResult);
  }

  if (!shouldTryCnpjFallback(primaryResult)) {
    return toFailure(primaryResult);
  }

  if (!canCallCnpjWs()) {
    logCnpjProviderStatus("CNPJ.ws", "skipped");
    return {
      ok: false,
      code: "rate_limited",
      message: CNPJ_MESSAGES.rateLimited,
    };
  }

  // Sequencial: só chama o fallback após falha elegível do principal.
  recordCnpjWsCall();
  const fallback = getFallbackCnpjProvider();
  const fallbackResult = await runProvider(fallback, cnpjDigits, timeoutMs);
  logAttempt(fallback.name, fallbackResult);

  if (fallbackResult.ok) {
    return toSuccess(fallbackResult.data, fallback.name, cnpjDigits);
  }

  if (
    fallbackResult.code === "not_found" ||
    fallbackResult.code === "rate_limited"
  ) {
    return toFailure(fallbackResult);
  }

  return {
    ok: false,
    code: "unavailable",
    message: CNPJ_MESSAGES.unavailable,
  };
}
