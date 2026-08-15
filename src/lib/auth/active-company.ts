import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdminEnv } from "@/lib/supabase/env-admin";
import { isFlowUuid } from "@/lib/auth/password-reset-flow";

/** Cookie httpOnly: empresa ativa escolhida pelo usuário (escopo de dados). */
export const ACTIVE_COMPANY_COOKIE = "tr_active_company";

/** Persistência longa — sobrevive a reload/navegação; validada contra memberships. */
export const ACTIVE_COMPANY_MAX_AGE_SEC = 60 * 60 * 24 * 180;

export type ActiveCompanyMarker = {
  v: 1;
  companyId: string;
  exp: number;
};

function signingKey() {
  const { serviceRoleKey } = getSupabaseAdminEnv();
  return serviceRoleKey;
}

function signPayload(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function serializeActiveCompanyMarker(companyId: string): string {
  if (!isFlowUuid(companyId)) {
    throw new Error("companyId inválido para cookie de empresa ativa.");
  }

  const body: ActiveCompanyMarker = {
    v: 1,
    companyId: companyId.trim(),
    exp: Date.now() + ACTIVE_COMPANY_MAX_AGE_SEC * 1000,
  };
  const payload = Buffer.from(JSON.stringify(body), "utf8").toString(
    "base64url"
  );
  return `${payload}.${signPayload(payload)}`;
}

export function parseActiveCompanyMarker(
  raw: string | undefined | null
): ActiveCompanyMarker | null {
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  try {
    if (!safeEqual(signature, signPayload(payload))) return null;

    const json = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(json) as Partial<ActiveCompanyMarker>;

    if (
      data.v !== 1 ||
      typeof data.companyId !== "string" ||
      !isFlowUuid(data.companyId) ||
      typeof data.exp !== "number"
    ) {
      return null;
    }

    if (data.exp < Date.now()) return null;

    return {
      v: 1,
      companyId: data.companyId.trim(),
      exp: data.exp,
    };
  } catch {
    return null;
  }
}

export function activeCompanyCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

/**
 * Resolve empresa ativa: preferência persistida se ainda for membership;
 * senão primeiro item da lista já ordenada (determinística).
 */
export function resolveActiveCompanyId(
  companyIds: string[],
  preferredCompanyId: string | null | undefined
): string | null {
  if (companyIds.length === 0) return null;

  if (
    preferredCompanyId &&
    companyIds.includes(preferredCompanyId)
  ) {
    return preferredCompanyId;
  }

  return companyIds[0] ?? null;
}
