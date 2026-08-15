"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_COMPANY_COOKIE,
  ACTIVE_COMPANY_MAX_AGE_SEC,
  activeCompanyCookieOptions,
  serializeActiveCompanyMarker,
} from "@/lib/auth/active-company";
import { isFlowUuid } from "@/lib/auth/password-reset-flow";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

/**
 * Persiste empresa ativa (cookie assinado) após validar membership do usuário.
 */
export async function persistActiveCompanyAction(
  companyId: string
): Promise<Result<{ companyId: string }>> {
  if (!isFlowUuid(companyId)) {
    return {
      data: null,
      error: { message: "Identificador de empresa inválido." },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
      error: { message: "Sessão autenticada ausente." },
    };
  }

  const { data: membership, error: memberError } = await supabase
    .from("company_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (memberError) {
    return {
      data: null,
      error: { message: memberError.message },
    };
  }

  if (!membership) {
    return {
      data: null,
      error: {
        message: "Você não possui vínculo com esta empresa.",
      },
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ACTIVE_COMPANY_COOKIE,
    serializeActiveCompanyMarker(companyId),
    activeCompanyCookieOptions(ACTIVE_COMPANY_MAX_AGE_SEC)
  );

  return { data: { companyId }, error: null };
}
