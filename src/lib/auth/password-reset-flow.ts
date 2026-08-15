import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdminEnv } from "@/lib/supabase/env-admin";

/** Cookie httpOnly: prova de que /auth/confirm validou o link Auth deste fluxo. */
export const PASSWORD_RESET_FLOW_COOKIE = "tr_pw_flow";

/** TTL curto — só cobre a tela de definir senha. */
export const PASSWORD_RESET_FLOW_MAX_AGE_SEC = 15 * 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PasswordResetFlowMarker = {
  /** v1 = só type/email; v2 = opcional inviteId/companyId do convite que originou o link */
  v: 1 | 2;
  /** Tipo OTP do Auth (invite, recovery, etc.) */
  type: string;
  /** E-mail normalizado da sessão estabelecida pelo link */
  email: string;
  /** Epoch ms de expiração */
  exp: number;
  /** Convite específico do fluxo (company invite). Ausente em “esqueci senha”. */
  inviteId?: string;
  companyId?: string;
};

export function normalizeFlowEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isFlowUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

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

export function serializePasswordResetFlowMarker(
  marker: Omit<PasswordResetFlowMarker, "v" | "exp"> & {
    exp?: number;
    inviteId?: string | null;
    companyId?: string | null;
  }
): string {
  const inviteId =
    marker.inviteId && isFlowUuid(marker.inviteId)
      ? marker.inviteId.trim()
      : undefined;
  const companyId =
    marker.companyId && isFlowUuid(marker.companyId)
      ? marker.companyId.trim()
      : undefined;

  const hasInviteContext = Boolean(inviteId && companyId);

  const body: PasswordResetFlowMarker = {
    v: 2,
    type: marker.type,
    email: normalizeFlowEmail(marker.email),
    exp:
      marker.exp ??
      Date.now() + PASSWORD_RESET_FLOW_MAX_AGE_SEC * 1000,
    ...(hasInviteContext
      ? { inviteId: inviteId!, companyId: companyId! }
      : {}),
  };
  const payload = Buffer.from(JSON.stringify(body), "utf8").toString(
    "base64url"
  );
  return `${payload}.${signPayload(payload)}`;
}

export function parsePasswordResetFlowMarker(
  raw: string | undefined | null
): PasswordResetFlowMarker | null {
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  try {
    if (!safeEqual(signature, signPayload(payload))) return null;

    const json = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(json) as Partial<PasswordResetFlowMarker>;

    if (
      (data.v !== 1 && data.v !== 2) ||
      typeof data.type !== "string" ||
      !data.type ||
      typeof data.email !== "string" ||
      !data.email ||
      typeof data.exp !== "number"
    ) {
      return null;
    }

    if (data.exp < Date.now()) return null;

    const inviteId =
      typeof data.inviteId === "string" && isFlowUuid(data.inviteId)
        ? data.inviteId.trim()
        : undefined;
    const companyId =
      typeof data.companyId === "string" && isFlowUuid(data.companyId)
        ? data.companyId.trim()
        : undefined;

    // Parcial inválido: exige ambos ou nenhum.
    const hasInviteContext = Boolean(inviteId && companyId);
    if ((inviteId || companyId) && !hasInviteContext) {
      return null;
    }

    return {
      v: data.v,
      type: data.type,
      email: normalizeFlowEmail(data.email),
      exp: data.exp,
      ...(hasInviteContext ? { inviteId, companyId } : {}),
    };
  } catch {
    return null;
  }
}

export function passwordResetFlowCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}
