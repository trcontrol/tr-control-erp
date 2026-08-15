"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";
import type { CompanyRole } from "@/lib/constants";
import {
  ACTIVE_COMPANY_COOKIE,
  ACTIVE_COMPANY_MAX_AGE_SEC,
  activeCompanyCookieOptions,
  serializeActiveCompanyMarker,
} from "@/lib/auth/active-company";
import {
  PASSWORD_RESET_FLOW_COOKIE,
  isFlowUuid,
  normalizeFlowEmail,
  parsePasswordResetFlowMarker,
} from "@/lib/auth/password-reset-flow";
import {
  acceptCompanyInviteByIdForUser,
  cancelCompanyInvite,
  createAndSendCompanyInvite,
  listPendingCompanyInvites,
  resendCompanyInvite,
  type PendingCompanyInvite,
} from "@/lib/users/invite-server";
import type { AccessProfileId, ModulePermissionState } from "@/lib/users/permissions";
import { createClient } from "@/lib/supabase/server";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type { PendingCompanyInvite };

export async function inviteCompanyUser(params: {
  companyId: string;
  fullName: string;
  email: string;
  role: CompanyRole;
  accessProfile: AccessProfileId;
  permissions: ModulePermissionState[];
}): Promise<Result<{ message: string }>> {
  const result = await createAndSendCompanyInvite(params);

  if ("error" in result) {
    return { data: null, error: { message: result.error } };
  }

  revalidatePath(ROUTES.users);
  return { data: { message: result.message }, error: null };
}

export async function listPendingInvitesAction(
  companyId: string
): Promise<Result<PendingCompanyInvite[]>> {
  const result = await listPendingCompanyInvites(companyId);

  if ("error" in result) {
    return { data: null, error: { message: result.error } };
  }

  return { data: result.data, error: null };
}

export async function resendCompanyInviteAction(params: {
  companyId: string;
  inviteId: string;
}): Promise<Result<{ message: string }>> {
  const result = await resendCompanyInvite({
    companyId: params.companyId,
    inviteId: params.inviteId,
  });

  if ("error" in result) {
    return { data: null, error: { message: result.error } };
  }

  revalidatePath(ROUTES.users);
  return { data: { message: result.message }, error: null };
}

export async function cancelCompanyInviteAction(params: {
  companyId: string;
  inviteId: string;
}): Promise<Result<{ message: string }>> {
  const result = await cancelCompanyInvite({
    companyId: params.companyId,
    inviteId: params.inviteId,
  });

  if ("error" in result) {
    return { data: null, error: { message: result.error } };
  }

  revalidatePath(ROUTES.users);
  return { data: { message: result.message }, error: null };
}

/**
 * Aceita somente o convite embutido no marcador tr_pw_flow (invite_id + company_id).
 * Sem contexto de convite (ex.: esqueci senha) → no-op bem-sucedido.
 * Define a empresa do convite como ativa (cookie assinado).
 */
export async function acceptFlowInviteAction(): Promise<
  Result<{ accepted: number; companyId: string | null }>
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return {
      data: null,
      error: { message: "Sessão autenticada ausente." },
    };
  }

  const cookieStore = await cookies();
  const marker = parsePasswordResetFlowMarker(
    cookieStore.get(PASSWORD_RESET_FLOW_COOKIE)?.value
  );

  if (!marker) {
    // Sem marcador: não aceita convites (nunca em massa).
    // Path "esqueci senha"/PKCE sem contexto de company invite.
    return { data: { accepted: 0, companyId: null }, error: null };
  }

  if (normalizeFlowEmail(user.email) !== marker.email) {
    return {
      data: null,
      error: {
        message:
          "A sessão atual não corresponde ao link de acesso. Abra novamente o link do e-mail.",
      },
    };
  }

  const inviteId = marker.inviteId;
  const companyId = marker.companyId;

  if (!inviteId || !companyId) {
    // Recuperação de senha sem convite de empresa.
    return { data: { accepted: 0, companyId: null }, error: null };
  }

  if (!isFlowUuid(inviteId) || !isFlowUuid(companyId)) {
    return {
      data: null,
      error: { message: "Identificadores do convite inválidos no fluxo." },
    };
  }

  try {
    const result = await acceptCompanyInviteByIdForUser({
      user,
      inviteId,
      companyId,
    });

    if (result.error) {
      return { data: null, error: { message: result.error } };
    }

    cookieStore.set(
      ACTIVE_COMPANY_COOKIE,
      serializeActiveCompanyMarker(result.companyId),
      activeCompanyCookieOptions(ACTIVE_COMPANY_MAX_AGE_SEC)
    );

    revalidatePath(ROUTES.dashboard);
    revalidatePath(ROUTES.users);

    return {
      data: { accepted: result.accepted ? 1 : 0, companyId: result.companyId },
      error: null,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível processar o convite.";
    if (/SERVICE_ROLE|service role|Admin/i.test(message)) {
      return {
        data: null,
        error: {
          message:
            "Convite não pôde ser processado. Verifique a configuração do servidor.",
        },
      };
    }
    return { data: null, error: { message } };
  }
}
