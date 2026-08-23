import { randomBytes } from "crypto";
import { type User } from "@supabase/supabase-js";
import {
  APP_URL,
  COMPANY_ROLES,
  ROUTES,
  type CompanyRole,
} from "@/lib/constants";
import { sendInviteAccessEmail } from "@/lib/email/send-invite-access-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ACCESS_PROFILES,
  type AccessProfileId,
  type ModulePermissionState,
  parseStoredPermissions,
  serializePermissionsForStorage,
  type PersistedModulePermission,
} from "@/lib/users/permissions";
import type { Json } from "@/types/database";

export const INVITE_TTL_DAYS = 7;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteRow = {
  id: string;
  company_id: string;
  email: string;
  full_name: string | null;
  role: string;
  access_profile: string;
  permissions: Json;
  status: string;
  expires_at: string;
  token: string;
  is_initial_owner: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isAccessProfileId(value: string): value is AccessProfileId {
  return (
    value === ACCESS_PROFILES.administrator ||
    value === ACCESS_PROFILES.manager ||
    value === ACCESS_PROFILES.professional ||
    value === ACCESS_PROFILES.attendant ||
    value === ACCESS_PROFILES.custom
  );
}

function roleForInvite(
  profile: AccessProfileId,
  requested: CompanyRole
): CompanyRole {
  if (requested === COMPANY_ROLES.owner) return COMPANY_ROLES.member;
  if (profile === ACCESS_PROFILES.administrator) return COMPANY_ROLES.admin;
  if (requested === COMPANY_ROLES.admin) return COMPANY_ROLES.admin;
  return COMPANY_ROLES.member;
}

export function createInviteToken() {
  return randomBytes(32).toString("hex");
}

export function inviteExpiresAt(from = new Date()) {
  const expires = new Date(from);
  expires.setUTCDate(expires.getUTCDate() + INVITE_TTL_DAYS);
  return expires.toISOString();
}

/** Destino pós-/auth/confirm (definir senha). Usado como `next` e redirectTo do generateLink. */
function passwordSetupRedirectTo() {
  const base = APP_URL.replace(/\/$/, "");
  return `${base}${ROUTES.resetPassword}`;
}

/**
 * Monta URL interna compatível com /auth/confirm (verifyOtp),
 * sem depender do template PKCE do Supabase.
 * invite_id/company_id identificam o convite do fluxo (não são secrets).
 */
function buildAuthConfirmUrl(
  tokenHash: string,
  type: "invite" | "recovery",
  inviteContext: { inviteId: string; companyId: string }
): string {
  const base = APP_URL.replace(/\/$/, "");
  const url = new URL(`${base}${ROUTES.authConfirm}`);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("next", ROUTES.resetPassword);
  url.searchParams.set("invite_id", inviteContext.inviteId);
  url.searchParams.set("company_id", inviteContext.companyId);
  return url.toString();
}

function extractHashedToken(properties: {
  hashed_token?: string | null;
  email_otp?: string | null;
} | null | undefined): string | null {
  const hashed = properties?.hashed_token?.trim();
  if (hashed) return hashed;
  return null;
}

/**
 * Gera link de acesso via Admin generateLink (invite | recovery) e envia
 * por mailer próprio. NÃO usa resetPasswordForEmail / PKCE server-side.
 *
 * Exportado para Super Admin (Owner inicial) e /users.
 */
export async function dispatchCompanyInviteEmail(params: {
  email: string;
  fullName: string;
  inviteId: string;
  companyId: string;
  token: string;
  existingAuthUserId: string | null;
}): Promise<{ error: string } | { ok: true; mode: "invite" | "recovery" }> {
  const admin = createAdminClient();
  const email = normalizeEmail(params.email);
  const redirectTo = passwordSetupRedirectTo();

  let mode: "invite" | "recovery" = params.existingAuthUserId
    ? "recovery"
    : "invite";
  let tokenHash: string | null = null;

  if (!params.existingAuthUserId) {
    const { data, error: inviteLinkError } =
      await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: {
            full_name: params.fullName,
            company_invite_id: params.inviteId,
            company_id: params.companyId,
            invite_token: params.token,
          },
          redirectTo,
        },
      });

    if (inviteLinkError) {
      const alreadyRegistered =
        /already\s+(been\s+)?registered|user already|already exists/i.test(
          inviteLinkError.message
        );
      if (!alreadyRegistered) {
        return {
          error: `Não foi possível gerar o link de convite: ${inviteLinkError.message}`,
        };
      }
      mode = "recovery";
    } else {
      tokenHash = extractHashedToken(data?.properties ?? null);
      if (!tokenHash) {
        return {
          error:
            "generateLink (invite) não retornou hashed_token. Não é possível montar /auth/confirm.",
        };
      }
    }
  }

  if (mode === "recovery" || !tokenHash) {
    const { data, error: recoveryLinkError } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

    if (recoveryLinkError) {
      return {
        error: `Não foi possível gerar o link de acesso: ${recoveryLinkError.message}`,
      };
    }

    tokenHash = extractHashedToken(data?.properties ?? null);
    if (!tokenHash) {
      return {
        error:
          "generateLink (recovery) não retornou hashed_token. Não é possível montar /auth/confirm.",
      };
    }
    mode = "recovery";
  }

  const confirmUrl = buildAuthConfirmUrl(tokenHash, mode, {
    inviteId: params.inviteId,
    companyId: params.companyId,
  });

  const { data: companyRow, error: companyError } = await admin
    .from("companies")
    .select("name")
    .eq("id", params.companyId)
    .maybeSingle();

  if (companyError) {
    return {
      error: `Não foi possível carregar a empresa para o e-mail: ${companyError.message}`,
    };
  }

  const companyName =
    (companyRow as { name?: string } | null)?.name?.trim() || "sua empresa";

  const sent = await sendInviteAccessEmail({
    to: email,
    fullName: params.fullName,
    companyName,
    confirmUrl,
    mode,
  });

  if ("error" in sent) {
    return { error: sent.error };
  }

  return { ok: true, mode };
}

export async function findAuthUserIdByEmail(
  email: string
): Promise<string | null> {
  const admin = createAdminClient();
  const normalized = normalizeEmail(email);

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Falha ao consultar usuários Auth: ${error.message}`);
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === normalized
    );
    if (match) return match.id;

    if (data.users.length < 200) break;
  }

  return null;
}

export async function assertCanManageCompanyUsers(companyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      user: null,
      message: "Sessão autenticada ausente.",
    };
  }

  const { data: membership, error } = await supabase
    .from("company_members")
    .select("id, role, status")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      user: null,
      message: `Não foi possível validar permissão: ${error.message}`,
    };
  }

  const row = membership as {
    id: string;
    role: string;
    status?: string | null;
  } | null;

  if (!row) {
    return {
      ok: false as const,
      user: null,
      message: "Você não pertence a esta empresa.",
    };
  }

  if (row.status === "inactive") {
    return {
      ok: false as const,
      user: null,
      message: "Sua conta está inativa nesta empresa.",
    };
  }

  if (row.role !== COMPANY_ROLES.owner && row.role !== COMPANY_ROLES.admin) {
    return {
      ok: false as const,
      user: null,
      message: "Apenas proprietários e administradores podem convidar usuários.",
    };
  }

  const { assertPlanEntitlement } = await import(
    "@/lib/plans/require-module-access"
  );
  const { PERMISSION_MODULES } = await import("@/lib/users/permissions");
  const planGate = await assertPlanEntitlement({
    companyId,
    module: PERMISSION_MODULES.users,
  });
  if (!planGate.ok) {
    return {
      ok: false as const,
      user: null,
      message: planGate.message,
    };
  }

  return { ok: true as const, user, message: null };
}

async function applyMemberPermissions(params: {
  companyId: string;
  membershipId: string;
  permissions: PersistedModulePermission[];
}) {
  const admin = createAdminClient();

  const { error: deleteError } = await admin
    .from("member_permissions")
    .delete()
    .eq("membership_id", params.membershipId);

  if (deleteError) {
    throw new Error(
      `Não foi possível limpar permissões anteriores: ${deleteError.message}`
    );
  }

  if (params.permissions.length === 0) return;

  const rows = params.permissions.map((permission) => ({
    company_id: params.companyId,
    membership_id: params.membershipId,
    module: permission.module,
    can_view: permission.can_view,
    can_create: permission.can_view ? permission.can_create : false,
    can_edit: permission.can_view ? permission.can_edit : false,
    can_delete: permission.can_view ? permission.can_delete : false,
    can_export: permission.can_view ? permission.can_export : false,
    scope: permission.scope,
  }));

  const { error: insertError } = await admin
    .from("member_permissions")
    .insert(rows as never);

  if (insertError) {
    throw new Error(
      `Não foi possível gravar permissões: ${insertError.message}`
    );
  }
}

/**
 * Política de identidade no aceite de convite:
 * A) profile vazio / inexistente → pode preencher com nome do convite; se metadata
 *    também vazia, inicializa Auth metadata.
 * B) profile já preenchido → NÃO sobrescreve profile nem metadata.
 * O nome do convite permanece em company_invites (histórico).
 */
async function applyInviteIdentityPolicy(params: {
  admin: ReturnType<typeof createAdminClient>;
  user: User;
  email: string;
  inviteFullName: string | null;
}): Promise<void> {
  const { admin, user, email, inviteFullName } = params;

  const { data: existingProfile, error: profileReadError } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError) {
    throw new Error(profileReadError.message);
  }

  const existingName =
    typeof (existingProfile as { full_name?: string | null } | null)
      ?.full_name === "string"
      ? (existingProfile as { full_name: string }).full_name.trim()
      : "";

  const inviteName =
    typeof inviteFullName === "string" ? inviteFullName.trim() : "";
  const metaRaw = user.user_metadata?.full_name;
  const metaName = typeof metaRaw === "string" ? metaRaw.trim() : "";

  if (existingName) {
    return;
  }

  const profileFullName = inviteName || metaName || email;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      full_name: profileFullName,
    } as never,
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!metaName && inviteName) {
    const { error: metaError } = await admin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...(user.user_metadata ?? {}),
          full_name: inviteName,
        },
      }
    );
    if (metaError) {
      throw new Error(metaError.message);
    }
  }
}

/**
 * Aceita um único convite (pending → accepted) com membership + permissões.
 * Idempotente se o convite já estiver accepted e o membership existir.
 * Owner inicial (is_initial_owner): role=owner + access_profile=administrator.
 */
async function acceptSingleCompanyInvite(params: {
  admin: ReturnType<typeof createAdminClient>;
  user: User;
  email: string;
  invite: InviteRow;
}): Promise<void> {
  const { admin, user, email, invite } = params;

  if (normalizeEmail(invite.email) !== email) {
    throw new Error(
      "Convite não corresponde ao e-mail do usuário autenticado."
    );
  }

  if (!user.id) {
    throw new Error("Usuário autenticado inválido para aceite do convite.");
  }

  if (invite.status === "accepted") {
    const { data: existingMember, error: existingError } = await admin
      .from("company_members")
      .select("id")
      .eq("company_id", invite.company_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existingMember) {
      throw new Error(
        "Convite já aceito, mas o vínculo com a empresa não foi encontrado."
      );
    }

    return;
  }

  if (invite.status !== "pending") {
    throw new Error("Convite não está mais pendente.");
  }

  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    throw new Error("Convite expirado.");
  }

  await applyInviteIdentityPolicy({
    admin,
    user,
    email,
    inviteFullName: invite.full_name,
  });

  // Owner inicial: invite nasce como admin + is_initial_owner; membership vira owner.
  // Convites normais nunca viram owner só por role no invite (CHECK impede role=owner).
  const role: CompanyRole = invite.is_initial_owner
    ? COMPANY_ROLES.owner
    : invite.role === COMPANY_ROLES.admin
      ? COMPANY_ROLES.admin
      : COMPANY_ROLES.member;

  const accessProfile = invite.is_initial_owner
    ? ACCESS_PROFILES.administrator
    : isAccessProfileId(invite.access_profile)
      ? invite.access_profile
      : ACCESS_PROFILES.professional;

  // Quota no aceite: exclui este convite (vaga já reservada). Se expirado, não exclui efeito útil.
  const { assertCompanyHasAvailableSeat } = await import("@/lib/plans/seats");
  const seatGate = await assertCompanyHasAvailableSeat({
    companyId: invite.company_id,
    excludeInviteId: invite.id,
    useAdmin: true,
    forAccept: true,
  });
  if (!seatGate.ok) {
    throw new Error(seatGate.message);
  }

  // Claim atômico (lock company + accept invite + upsert membership) — migration 032.
  const { data: claimedId, error: claimError } = await (
    admin as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: string | null; error: { message: string } | null }>;
    }
  ).rpc("claim_company_invite_membership", {
    p_invite_id: invite.id,
    p_company_id: invite.company_id,
    p_user_id: user.id,
    p_role: role,
    p_access_profile: accessProfile,
  });

  if (claimError) {
    const msg = claimError.message;
    if (
      msg.includes("company_seat_limit_exceeded") ||
      msg.includes("Limite de usuários")
    ) {
      const { seatAcceptBlockedMessage } = await import("@/lib/plans/limits");
      throw new Error(seatAcceptBlockedMessage());
    }
    throw new Error(msg);
  }

  const membershipId =
    typeof claimedId === "string"
      ? claimedId
      : (claimedId as string | null) ?? null;

  if (!membershipId) {
    throw new Error("Não foi possível vincular o membership do convite.");
  }

  let permissions = parseStoredPermissions(invite.permissions);
  if (invite.is_initial_owner && permissions.length === 0) {
    const { data: companyPlanRow } = await admin
      .from("companies")
      .select("plan")
      .eq("id", invite.company_id)
      .maybeSingle();
    const { data: overrideRows } = await admin
      .from("company_module_overrides")
      .select("module_key, enabled")
      .eq("company_id", invite.company_id);
    const { permissionsForProfileInCompany, buildModuleOverrideMap } =
      await import("@/lib/plans/access");
    const { normalizeCompanyPlan } = await import("@/lib/plans/entitlements");
    const overrides = buildModuleOverrideMap(
      (overrideRows ?? []) as Array<{ module_key: string; enabled: boolean }>
    );
    permissions = serializePermissionsForStorage(
      permissionsForProfileInCompany(
        ACCESS_PROFILES.administrator,
        normalizeCompanyPlan(
          (companyPlanRow as { plan?: string } | null)?.plan
        ),
        overrides
      )
    );
  } else if (permissions.length > 0) {
    const { data: companyPlanRow } = await admin
      .from("companies")
      .select("plan")
      .eq("id", invite.company_id)
      .maybeSingle();
    const { data: overrideRows } = await admin
      .from("company_module_overrides")
      .select("module_key, enabled")
      .eq("company_id", invite.company_id);
    const {
      assertPermissionsWithinCompany,
      buildModuleOverrideMap,
      entitledModuleSetForCompany,
    } = await import("@/lib/plans/access");
    const { normalizeCompanyPlan } = await import("@/lib/plans/entitlements");
    const plan = normalizeCompanyPlan(
      (companyPlanRow as { plan?: string } | null)?.plan
    );
    const overrides = buildModuleOverrideMap(
      (overrideRows ?? []) as Array<{ module_key: string; enabled: boolean }>
    );
    const gate = assertPermissionsWithinCompany(permissions, plan, overrides);
    if (!gate.ok) {
      // Orphan/out-of-plan rows no invite: mantém só módulos do teto efetivo.
      const entitled = entitledModuleSetForCompany(plan, overrides);
      permissions = permissions.filter((row) =>
        entitled.has(row.module as never)
      );
    }
  }

  await applyMemberPermissions({
    companyId: invite.company_id,
    membershipId,
    permissions,
  });
}

/**
 * Aceita SOMENTE o convite identificado (invite_id + company_id), após validar
 * e-mail do usuário autenticado. Não processa outros pending.
 */
export async function acceptCompanyInviteByIdForUser(params: {
  user: User;
  inviteId: string;
  companyId: string;
}): Promise<{
  accepted: boolean;
  companyId: string;
  error: string | null;
}> {
  const email = params.user.email
    ? normalizeEmail(params.user.email)
    : null;

  if (!email) {
    return {
      accepted: false,
      companyId: params.companyId,
      error: "Sessão sem e-mail para vincular o convite.",
    };
  }

  const admin = createAdminClient();

  const { data: inviteRow, error: inviteError } = await admin
    .from("company_invites")
    .select(
      "id, company_id, email, full_name, role, access_profile, permissions, status, expires_at, token, is_initial_owner"
    )
    .eq("id", params.inviteId)
    .eq("company_id", params.companyId)
    .maybeSingle();

  if (inviteError) {
    return {
      accepted: false,
      companyId: params.companyId,
      error: `Falha ao carregar convite: ${inviteError.message}`,
    };
  }

  if (!inviteRow) {
    return {
      accepted: false,
      companyId: params.companyId,
      error: "Convite não encontrado para este fluxo.",
    };
  }

  const item = inviteRow as Omit<InviteRow, "is_initial_owner"> & {
    is_initial_owner?: boolean | null;
  };
  const invite: InviteRow = {
    ...item,
    is_initial_owner: item.is_initial_owner === true,
  };

  try {
    await acceptSingleCompanyInvite({
      admin,
      user: params.user,
      email,
      invite,
    });
    return {
      accepted: true,
      companyId: invite.company_id,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao aceitar convite.";
    return {
      accepted: false,
      companyId: invite.company_id,
      error: message,
    };
  }
}

export async function createAndSendCompanyInvite(params: {
  companyId: string;
  fullName: string;
  email: string;
  role: CompanyRole;
  accessProfile: AccessProfileId;
  permissions: ModulePermissionState[];
}): Promise<{ message: string } | { error: string }> {
  const fullName = params.fullName.trim();
  const email = normalizeEmail(params.email);

  if (!fullName) {
    return { error: "Informe o nome completo." };
  }

  if (!EMAIL_RE.test(email)) {
    return { error: "Informe um e-mail válido." };
  }

  if (params.role === COMPANY_ROLES.owner) {
    return { error: "Não é permitido convidar um usuário como proprietário." };
  }

  const authz = await assertCanManageCompanyUsers(params.companyId);
  if (!authz.ok || !authz.user) {
    return { error: authz.message };
  }

  if (authz.user.email && normalizeEmail(authz.user.email) === email) {
    return { error: "Você não pode convidar o próprio e-mail." };
  }

  const resolvedRole = roleForInvite(params.accessProfile, params.role);

  if (resolvedRole === COMPANY_ROLES.owner) {
    return { error: "Não é permitido convidar um usuário como proprietário." };
  }

  const inviteRole =
    resolvedRole === COMPANY_ROLES.admin
      ? COMPANY_ROLES.admin
      : COMPANY_ROLES.member;

  let existingAuthUserId: string | null = null;
  try {
    existingAuthUserId = await findAuthUserIdByEmail(email);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Falha ao verificar e-mail no Auth.",
    };
  }

  const admin = createAdminClient();
  const supabase = await createClient();

  if (existingAuthUserId) {
    const { data: existingMember, error: memberError } = await admin
      .from("company_members")
      .select("id")
      .eq("company_id", params.companyId)
      .eq("user_id", existingAuthUserId)
      .maybeSingle();

    if (memberError) {
      return {
        error: `Não foi possível verificar membros existentes: ${memberError.message}`,
      };
    }

    if (existingMember) {
      return { error: "Este e-mail já é membro desta empresa." };
    }
  }

  const permissionsPayload = serializePermissionsForStorage(
    params.permissions
  );

  const { data: companyForPlan, error: companyPlanError } = await admin
    .from("companies")
    .select("plan")
    .eq("id", params.companyId)
    .maybeSingle();

  if (companyPlanError) {
    return {
      error: `Não foi possível carregar o plano da empresa: ${companyPlanError.message}`,
    };
  }

  const { data: overrideRows } = await admin
    .from("company_module_overrides")
    .select("module_key, enabled")
    .eq("company_id", params.companyId);

  const { assertPermissionsWithinCompany, buildModuleOverrideMap } =
    await import("@/lib/plans/access");
  const { normalizeCompanyPlan } = await import("@/lib/plans/entitlements");
  const planGate = assertPermissionsWithinCompany(
    permissionsPayload,
    normalizeCompanyPlan((companyForPlan as { plan?: string } | null)?.plan),
    buildModuleOverrideMap(
      (overrideRows ?? []) as Array<{ module_key: string; enabled: boolean }>
    )
  );
  if (!planGate.ok) {
    return { error: planGate.message };
  }

  const token = createInviteToken();
  const expiresAt = inviteExpiresAt();

  const { data: existingInvite, error: existingInviteError } = await supabase
    .from("company_invites")
    .select("id, status, expires_at")
    .eq("company_id", params.companyId)
    .eq("email", email)
    .maybeSingle();

  if (existingInviteError) {
    return {
      error: `Não foi possível verificar convites existentes: ${existingInviteError.message}`,
    };
  }

  const existing = existingInvite as {
    id: string;
    status: string;
    expires_at: string;
  } | null;
  let inviteId: string;

  if (existing) {
    if (existing.status === "pending") {
      // Reenviar em vez de bloquear (mesmo e-mail / sem duplicar Auth / 1 seat).
      return resendCompanyInvite({
        companyId: params.companyId,
        inviteId: existing.id,
        fullName,
        role: inviteRole,
        accessProfile: params.accessProfile,
        permissions: params.permissions,
      });
    }

    // Reabrir convite encerrado → precisa de vaga (não estava reservando).
    const { assertCompanyHasAvailableSeat } = await import("@/lib/plans/seats");
    const seatGate = await assertCompanyHasAvailableSeat({
      companyId: params.companyId,
    });
    if (!seatGate.ok) {
      return { error: seatGate.message };
    }

    const { data: updated, error: updateError } = await supabase
      .from("company_invites")
      .update({
        full_name: fullName,
        role: inviteRole,
        access_profile: params.accessProfile,
        invited_by: authz.user.id,
        token,
        status: "pending",
        expires_at: expiresAt,
        permissions: permissionsPayload,
      } as never)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (updateError || !updated) {
      return {
        error: `Não foi possível atualizar o convite: ${updateError?.message ?? "erro desconhecido"}`,
      };
    }

    inviteId = (updated as { id: string }).id;
  } else {
    const { assertCompanyHasAvailableSeat } = await import("@/lib/plans/seats");
    const seatGate = await assertCompanyHasAvailableSeat({
      companyId: params.companyId,
    });
    if (!seatGate.ok) {
      return { error: seatGate.message };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("company_invites")
      .insert({
        company_id: params.companyId,
        email,
        full_name: fullName,
        role: inviteRole,
        access_profile: params.accessProfile,
        invited_by: authz.user.id,
        token,
        status: "pending",
        expires_at: expiresAt,
        permissions: permissionsPayload,
      } as never)
      .select("id")
      .single();

    if (insertError || !inserted) {
      const duplicate =
        insertError?.code === "23505" ||
        insertError?.message?.toLowerCase().includes("duplicate");
      const seatDenied =
        insertError?.message?.includes("company_seat_limit_exceeded") ||
        insertError?.message?.includes("Limite de usuários");
      return {
        error: seatDenied
          ? insertError?.message ?? "Limite de usuários atingido."
          : duplicate
            ? "Já existe um convite para este e-mail nesta empresa."
            : `Não foi possível criar o convite: ${insertError?.message ?? "erro desconhecido"}`,
      };
    }

    inviteId = (inserted as { id: string }).id;
  }

  const dispatched = await dispatchCompanyInviteEmail({
    email,
    fullName,
    inviteId,
    companyId: params.companyId,
    token,
    existingAuthUserId,
  });

  if ("error" in dispatched) {
    await admin
      .from("company_invites")
      .update({ status: "cancelled" } as never)
      .eq("id", inviteId)
      .eq("status", "pending");

    return { error: dispatched.error };
  }

  return {
    message:
      dispatched.mode === "recovery"
        ? "Convite atualizado. Enviamos um link para o convidado definir a senha e acessar a empresa."
        : "Convite enviado com sucesso. O convidado receberá um e-mail para criar a senha e acessar a empresa.",
  };
}

export type PendingCompanyInvite = {
  id: string;
  companyId: string;
  email: string;
  fullName: string | null;
  role: CompanyRole;
  accessProfile: AccessProfileId;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export async function listPendingCompanyInvites(
  companyId: string
): Promise<{ data: PendingCompanyInvite[] } | { error: string }> {
  const authz = await assertCanManageCompanyUsers(companyId);
  if (!authz.ok) {
    return { error: authz.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_invites")
    .select(
      "id, company_id, email, full_name, role, access_profile, status, expires_at, created_at"
    )
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: `Não foi possível listar convites: ${error.message}` };
  }

  const rows = (data ?? []).map((row) => {
    const item = row as {
      id: string;
      company_id: string;
      email: string;
      full_name: string | null;
      role: string;
      access_profile: string;
      status: string;
      expires_at: string;
      created_at: string;
    };

    const role: CompanyRole =
      item.role === COMPANY_ROLES.admin
        ? COMPANY_ROLES.admin
        : COMPANY_ROLES.member;

    return {
      id: item.id,
      companyId: item.company_id,
      email: item.email,
      fullName: item.full_name,
      role,
      accessProfile: isAccessProfileId(item.access_profile)
        ? item.access_profile
        : ACCESS_PROFILES.professional,
      status: item.status,
      expiresAt: item.expires_at,
      createdAt: item.created_at,
    };
  });

  return { data: rows };
}

export async function resendCompanyInvite(params: {
  companyId: string;
  inviteId: string;
  fullName?: string;
  role?: CompanyRole;
  accessProfile?: AccessProfileId;
  permissions?: ModulePermissionState[];
}): Promise<{ message: string } | { error: string }> {
  const authz = await assertCanManageCompanyUsers(params.companyId);
  if (!authz.ok || !authz.user) {
    return { error: authz.message };
  }

  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: invite, error: inviteError } = await supabase
    .from("company_invites")
    .select(
      "id, company_id, email, full_name, role, access_profile, permissions, status, expires_at"
    )
    .eq("id", params.inviteId)
    .eq("company_id", params.companyId)
    .maybeSingle();

  if (inviteError || !invite) {
    return {
      error: inviteError
        ? `Não foi possível carregar o convite: ${inviteError.message}`
        : "Convite não encontrado.",
    };
  }

  const row = invite as {
    id: string;
    company_id: string;
    email: string;
    full_name: string | null;
    role: string;
    access_profile: string;
    permissions: Json;
    status: string;
    expires_at?: string;
  };

  if (row.status === "accepted" || row.status === "cancelled") {
    return {
      error:
        "Este convite não está pendente e não pode ser reenviado. Crie um novo convite se necessário.",
    };
  }

  // Se o pending já expirou, o reenvio re-reserva vaga → precisa de seat (exclui este id).
  const stillValid =
    row.status === "pending" &&
    row.expires_at != null &&
    new Date(row.expires_at).getTime() > Date.now();

  if (!stillValid) {
    const { assertCompanyHasAvailableSeat } = await import("@/lib/plans/seats");
    const seatGate = await assertCompanyHasAvailableSeat({
      companyId: params.companyId,
      excludeInviteId: row.id,
    });
    if (!seatGate.ok) {
      return { error: seatGate.message };
    }
  }

  const email = normalizeEmail(row.email);

  let existingAuthUserId: string | null = null;
  try {
    existingAuthUserId = await findAuthUserIdByEmail(email);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Falha ao verificar e-mail no Auth.",
    };
  }

  if (existingAuthUserId) {
    const { data: existingMember, error: memberError } = await admin
      .from("company_members")
      .select("id")
      .eq("company_id", params.companyId)
      .eq("user_id", existingAuthUserId)
      .maybeSingle();

    if (memberError) {
      return {
        error: `Não foi possível verificar membros: ${memberError.message}`,
      };
    }

    if (existingMember) {
      await supabase
        .from("company_invites")
        .update({ status: "accepted" } as never)
        .eq("id", row.id);
      return {
        error: "Este e-mail já é membro desta empresa. O convite foi encerrado.",
      };
    }
  }

  const fullName = (params.fullName ?? row.full_name ?? "").trim() || email;
  const accessProfile =
    params.accessProfile && isAccessProfileId(params.accessProfile)
      ? params.accessProfile
      : isAccessProfileId(row.access_profile)
        ? row.access_profile
        : ACCESS_PROFILES.professional;

  const inviteRole: CompanyRole =
    params.role != null
      ? params.role === COMPANY_ROLES.admin
        ? COMPANY_ROLES.admin
        : COMPANY_ROLES.member
      : row.role === COMPANY_ROLES.admin
        ? COMPANY_ROLES.admin
        : COMPANY_ROLES.member;

  // Preserva permissões já salvas no convite se o reenvio não enviar overrides.
  const permissionsPayload = params.permissions
    ? serializePermissionsForStorage(params.permissions)
    : row.permissions;

  const token = createInviteToken();
  const expiresAt = inviteExpiresAt();

  // Novo token invalida o link anterior; preserva empresa e atualiza payload.
  const { error: updateError } = await supabase
    .from("company_invites")
    .update({
      full_name: fullName,
      role: inviteRole,
      access_profile: accessProfile,
      invited_by: authz.user.id,
      token,
      status: "pending",
      expires_at: expiresAt,
      permissions: permissionsPayload,
    } as never)
    .eq("id", row.id)
    .eq("company_id", params.companyId);

  if (updateError) {
    return {
      error: `Não foi possível renovar o convite: ${updateError.message}`,
    };
  }

  const dispatched = await dispatchCompanyInviteEmail({
    email,
    fullName,
    inviteId: row.id,
    companyId: params.companyId,
    token,
    existingAuthUserId,
  });

  if ("error" in dispatched) {
    return { error: dispatched.error };
  }

  return {
    message:
      dispatched.mode === "recovery"
        ? "Convite reenviado. O convidado receberá um link para definir a senha."
        : "Convite reenviado com sucesso.",
  };
}

/**
 * Cancela convite pending (soft): status → cancelled.
 * Libera a vaga reservada. Link antigo deixa de ser aceitável.
 */
export async function cancelCompanyInvite(params: {
  companyId: string;
  inviteId: string;
}): Promise<{ message: string } | { error: string }> {
  const authz = await assertCanManageCompanyUsers(params.companyId);
  if (!authz.ok || !authz.user) {
    return { error: authz.message };
  }

  const supabase = await createClient();
  const { data: invite, error: inviteError } = await supabase
    .from("company_invites")
    .select("id, status, expires_at")
    .eq("id", params.inviteId)
    .eq("company_id", params.companyId)
    .maybeSingle();

  if (inviteError || !invite) {
    return {
      error: inviteError
        ? `Não foi possível carregar o convite: ${inviteError.message}`
        : "Convite não encontrado.",
    };
  }

  const row = invite as { id: string; status: string; expires_at: string };

  if (row.status !== "pending") {
    return {
      error: "Somente convites pendentes podem ser cancelados.",
    };
  }

  const { error: updateError } = await supabase
    .from("company_invites")
    .update({ status: "cancelled" } as never)
    .eq("id", row.id)
    .eq("company_id", params.companyId)
    .eq("status", "pending");

  if (updateError) {
    return {
      error: `Não foi possível cancelar o convite: ${updateError.message}`,
    };
  }

  return {
    message: "Convite cancelado. A vaga foi liberada no plano.",
  };
}
