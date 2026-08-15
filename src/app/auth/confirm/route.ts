import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/lib/constants";
import {
  PASSWORD_RESET_FLOW_COOKIE,
  PASSWORD_RESET_FLOW_MAX_AGE_SEC,
  isFlowUuid,
  passwordResetFlowCookieOptions,
  serializePasswordResetFlowMarker,
} from "@/lib/auth/password-reset-flow";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return ROUTES.resetPassword;
  }
  return next;
}

/**
 * Confirma links de e-mail Auth via token_hash (padrão oficial SSR / PKCE).
 * Evita exchangeCodeForSession no browser do destinatário — necessário quando
 * o e-mail foi disparado no servidor (convite/reenvio Owner), onde o
 * code_verifier PKCE nunca existiu no storage do convidado.
 *
 * Templates (Dashboard → Auth → Email Templates) devem usar:
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...&next={{ .RedirectTo }}
 *
 * Convites de empresa (mailer próprio) também passam invite_id + company_id
 * (não secretos) para o marcador tr_pw_flow assinado.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNextPath(searchParams.get("next"));
  const inviteIdParam = searchParams.get("invite_id");
  const companyIdParam = searchParams.get("company_id");

  const failureUrl = new URL(ROUTES.resetPassword, origin);
  failureUrl.searchParams.set("error", "auth_confirm_error");

  if (!token_hash || !type) {
    return NextResponse.redirect(failureUrl);
  }

  const inviteId = isFlowUuid(inviteIdParam) ? inviteIdParam.trim() : null;
  const companyId = isFlowUuid(companyIdParam) ? companyIdParam.trim() : null;
  const inviteContext =
    inviteId && companyId ? { inviteId, companyId } : null;

  const { url, publishableKey } = getSupabaseEnv();
  const successResponse = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          successResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Evita misturar sessão prévia (outro usuário no mesmo browser) com o OTP do link.
  await supabase.auth.signOut();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (error) {
    failureUrl.searchParams.set(
      "error_description",
      error.message || "auth_confirm_error"
    );
    return NextResponse.redirect(failureUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    failureUrl.searchParams.set(
      "error_description",
      "Sessão Auth não estabelecida após confirmação do link."
    );
    return NextResponse.redirect(failureUrl);
  }

  // Marcador httpOnly de curta duração: prova do fluxo do link (sem token/OTP/senha).
  successResponse.cookies.set(
    PASSWORD_RESET_FLOW_COOKIE,
    serializePasswordResetFlowMarker({
      type,
      email: user.email,
      inviteId: inviteContext?.inviteId,
      companyId: inviteContext?.companyId,
    }),
    passwordResetFlowCookieOptions(PASSWORD_RESET_FLOW_MAX_AGE_SEC)
  );

  return successResponse;
}
