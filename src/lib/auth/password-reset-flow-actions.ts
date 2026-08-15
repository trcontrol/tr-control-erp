"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  PASSWORD_RESET_FLOW_COOKIE,
  normalizeFlowEmail,
  parsePasswordResetFlowMarker,
  passwordResetFlowCookieOptions,
} from "@/lib/auth/password-reset-flow";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

/**
 * Valida marcador httpOnly + sessão Auth do mesmo e-mail.
 * Usado pelo path sem ?code em /reset-password.
 */
export async function validatePasswordResetFlowAction(): Promise<
  Result<{
    email: string;
    type: string;
    inviteId: string | null;
    companyId: string | null;
  }>
> {
  const cookieStore = await cookies();
  const marker = parsePasswordResetFlowMarker(
    cookieStore.get(PASSWORD_RESET_FLOW_COOKIE)?.value
  );

  if (!marker) {
    return {
      data: null,
      error: {
        message:
          "Link inválido, expirado ou fluxo não autenticado. Abra novamente o link do e-mail.",
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return {
      data: null,
      error: {
        message:
          "Sessão do link ausente. Abra novamente o convite ou o link de recuperação.",
      },
    };
  }

  if (normalizeFlowEmail(user.email) !== marker.email) {
    return {
      data: null,
      error: {
        message:
          "A sessão atual não corresponde ao link de acesso. Feche outras contas neste navegador e abra o link do e-mail novamente.",
      },
    };
  }

  return {
    data: {
      email: marker.email,
      type: marker.type,
      inviteId: marker.inviteId ?? null,
      companyId: marker.companyId ?? null,
    },
    error: null,
  };
}

/** Impede reutilização do marcador após senha/aceite concluídos. */
export async function clearPasswordResetFlowAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PASSWORD_RESET_FLOW_COOKIE, "", {
    ...passwordResetFlowCookieOptions(0),
    maxAge: 0,
  });
}
