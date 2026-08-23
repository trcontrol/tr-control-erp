import { COMPANY_ROLES, type CompanyRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  USER_STATUS,
  type UserStatus,
} from "@/lib/users/format";
import { assertCanManageCompanyUsers } from "@/lib/users/invite-server";
import {
  assertPermissionsWithinCompany,
  permissionsForProfileInCompany,
} from "@/lib/plans/access";
import {
  buildModuleOverrideMap,
  EMPTY_MODULE_OVERRIDES,
  type CompanyModuleOverrides,
} from "@/lib/plans/company-entitlements";
import { normalizeCompanyPlan } from "@/lib/plans/entitlements";
import {
  ACCESS_PROFILES,
  type AccessProfileId,
  type ModulePermissionState,
  applyViewDependency,
  companyRoleForAccessProfile,
  hydrateModulePermissionsFromStored,
  isAccessProfileId,
  isPermissionModuleId,
  protectPrimaryOwnerPermissions,
  serializePermissionsForStorage,
  type PersistedModulePermission,
} from "@/lib/users/permissions";

export { companyRoleForAccessProfile };

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

type MembershipTarget = {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  status: string;
  access_profile: string;
};

function isUserStatus(value: string): value is UserStatus {
  return (
    value === USER_STATUS.active ||
    value === USER_STATUS.inactive ||
    value === USER_STATUS.pending
  );
}

function isCompanyRole(value: string): value is CompanyRole {
  return (
    value === COMPANY_ROLES.owner ||
    value === COMPANY_ROLES.admin ||
    value === COMPANY_ROLES.member
  );
}

async function loadMembershipTarget(params: {
  companyId: string;
  membershipId: string;
}): Promise<Result<MembershipTarget>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_members")
    .select("id, company_id, user_id, role, status, access_profile")
    .eq("id", params.membershipId)
    .eq("company_id", params.companyId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: { message: `Erro ao carregar membro: ${error.message}` },
    };
  }

  if (!data) {
    return {
      data: null,
      error: { message: "Usuário não encontrado nesta empresa." },
    };
  }

  return { data: data as MembershipTarget, error: null };
}

function normalizePermissionsPayload(
  permissions: ModulePermissionState[],
  options: {
    isPrimaryOwner: boolean;
    isSelf: boolean;
    plan: string;
    overrides?: CompanyModuleOverrides;
  }
): Result<PersistedModulePermission[]> {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return {
      data: null,
      error: { message: "Informe as permissões por módulo." },
    };
  }

  const planGate = assertPermissionsWithinCompany(
    permissions,
    options.plan,
    options.overrides ?? EMPTY_MODULE_OVERRIDES
  );
  if (!planGate.ok) {
    return { data: null, error: { message: planGate.message } };
  }

  const seen = new Set<string>();
  const normalized: ModulePermissionState[] = [];

  for (const item of permissions) {
    if (!item || !isPermissionModuleId(item.module)) {
      return {
        data: null,
        error: { message: "Permissão com módulo inválido." },
      };
    }
    if (seen.has(item.module)) {
      return {
        data: null,
        error: { message: `Módulo duplicado nas permissões: ${item.module}` },
      };
    }
    seen.add(item.module);
    normalized.push(applyViewDependency(item));
  }

  const protectedPermissions = protectPrimaryOwnerPermissions(normalized, options);
  return {
    data: serializePermissionsForStorage(protectedPermissions),
    error: null,
  };
}

async function loadCompanyPlanAndOverrides(
  companyId: string
): Promise<
  Result<{ plan: string; overrides: CompanyModuleOverrides }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message } };
  }
  if (!data) {
    return { data: null, error: { message: "Empresa não encontrada." } };
  }

  const plan = normalizeCompanyPlan((data as { plan?: string }).plan);

  const { data: overrideRows, error: overrideError } = await supabase
    .from("company_module_overrides")
    .select("module_key, enabled")
    .eq("company_id", companyId);

  if (overrideError) {
    if (
      overrideError.message.includes("company_module_overrides") ||
      overrideError.code === "42P01" ||
      overrideError.code === "PGRST205"
    ) {
      return { data: { plan, overrides: EMPTY_MODULE_OVERRIDES }, error: null };
    }
    return { data: null, error: { message: overrideError.message } };
  }

  return {
    data: {
      plan,
      overrides: buildModuleOverrideMap(
        (overrideRows ?? []) as Array<{ module_key: string; enabled: boolean }>
      ),
    },
    error: null,
  };
}

/**
 * Substitui member_permissions do membership (sem órfãos).
 * Usa sessão autenticada + RLS (can_manage_company); não usa service_role.
 */
async function replaceMemberPermissions(params: {
  companyId: string;
  membershipId: string;
  permissions: PersistedModulePermission[];
}): Promise<Result<null>> {
  const supabase = await createClient();

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

  const { error: upsertError } = await supabase
    .from("member_permissions")
    .upsert(rows as never, { onConflict: "membership_id,module" });

  if (upsertError) {
    return {
      data: null,
      error: {
        message: `Não foi possível gravar permissões: ${upsertError.message}`,
      },
    };
  }

  const keepModules = new Set(params.permissions.map((row) => row.module));

  const { data: existing, error: existingError } = await supabase
    .from("member_permissions")
    .select("id, module")
    .eq("membership_id", params.membershipId)
    .eq("company_id", params.companyId);

  if (existingError) {
    return {
      data: null,
      error: {
        message: `Não foi possível validar permissões existentes: ${existingError.message}`,
      },
    };
  }

  const orphanIds = ((existing ?? []) as { id: string; module: string }[])
    .filter((row) => !keepModules.has(row.module))
    .map((row) => row.id);

  if (orphanIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("member_permissions")
      .delete()
      .in("id", orphanIds)
      .eq("company_id", params.companyId);

    if (deleteError) {
      return {
        data: null,
        error: {
          message: `Não foi possível limpar permissões antigas: ${deleteError.message}`,
        },
      };
    }
  }

  return { data: null, error: null };
}

export async function getCompanyMemberPermissions(params: {
  companyId: string;
  membershipId: string;
}): Promise<
  Result<{
    accessProfile: AccessProfileId;
    permissions: ModulePermissionState[];
    isPrimaryOwner: boolean;
    plan: string;
  }>
> {
  const authz = await assertCanManageCompanyUsers(params.companyId);
  if (!authz.ok || !authz.user) {
    return { data: null, error: { message: authz.message } };
  }

  const targetResult = await loadMembershipTarget(params);
  if (targetResult.error || !targetResult.data) {
    return { data: null, error: targetResult.error };
  }

  const target = targetResult.data;
  const accessProfile = isAccessProfileId(target.access_profile)
    ? target.access_profile
    : ACCESS_PROFILES.professional;

  const planResult = await loadCompanyPlanAndOverrides(params.companyId);
  if (planResult.error || planResult.data == null) {
    return {
      data: null,
      error: planResult.error ?? { message: "Plano da empresa indisponível." },
    };
  }
  const { plan, overrides } = planResult.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_permissions")
    .select(
      "module, can_view, can_create, can_edit, can_delete, can_export, scope"
    )
    .eq("membership_id", params.membershipId)
    .eq("company_id", params.companyId);

  if (error) {
    return {
      data: null,
      error: { message: `Erro ao carregar permissões: ${error.message}` },
    };
  }

  const stored = (data ?? []) as PersistedModulePermission[];
  const isPrimaryOwner = target.role === COMPANY_ROLES.owner;
  const basePermissions =
    stored.length > 0
      ? hydrateModulePermissionsFromStored(stored, accessProfile)
      : permissionsForProfileInCompany(accessProfile, plan, overrides);

  // Runtime: teto efetivo da empresa vence — UI só vê módulos contratados.
  const { intersectPermissionsWithCompany } = await import("@/lib/plans/access");
  const scoped = intersectPermissionsWithCompany(
    basePermissions,
    plan,
    overrides
  );

  const permissions = protectPrimaryOwnerPermissions(scoped, {
    isPrimaryOwner,
    isSelf: isPrimaryOwner || target.user_id === authz.user.id,
  });

  return {
    data: { accessProfile, permissions, isPrimaryOwner, plan },
    error: null,
  };
}

export async function updateCompanyMemberStatus(params: {
  companyId: string;
  membershipId: string;
  status: UserStatus;
}): Promise<Result<null>> {
  const authz = await assertCanManageCompanyUsers(params.companyId);
  if (!authz.ok || !authz.user) {
    return { data: null, error: { message: authz.message } };
  }

  if (!isUserStatus(params.status)) {
    return { data: null, error: { message: "Status inválido." } };
  }

  // Toggle da UI só usa active/inactive; pending fica para convites.
  if (
    params.status !== USER_STATUS.active &&
    params.status !== USER_STATUS.inactive
  ) {
    return {
      data: null,
      error: {
        message: "Use a lista de convites para status pendente.",
      },
    };
  }

  const targetResult = await loadMembershipTarget({
    companyId: params.companyId,
    membershipId: params.membershipId,
  });
  if (targetResult.error || !targetResult.data) {
    return { data: null, error: targetResult.error };
  }

  const target = targetResult.data;

  if (
    target.status !== USER_STATUS.active &&
    params.status === USER_STATUS.active
  ) {
    const { assertCompanyHasAvailableSeat } = await import("@/lib/plans/seats");
    const seatGate = await assertCompanyHasAvailableSeat({
      companyId: params.companyId,
      forReactivate: true,
    });
    if (!seatGate.ok) {
      return { data: null, error: { message: seatGate.message } };
    }
  }

  if (
    target.role === COMPANY_ROLES.owner &&
    params.status === USER_STATUS.inactive
  ) {
    const supabase = await createClient();
    const { data: owners, error: ownersError } = await supabase
      .from("company_members")
      .select("id")
      .eq("company_id", params.companyId)
      .eq("role", COMPANY_ROLES.owner)
      .neq("status", USER_STATUS.inactive);

    if (ownersError) {
      return {
        data: null,
        error: { message: `Erro ao validar proprietários: ${ownersError.message}` },
      };
    }

    const activeOwners = (owners ?? []).filter(
      (row) => (row as { id: string }).id !== target.id
    );
    if (activeOwners.length === 0) {
      return {
        data: null,
        error: {
          message:
            "Não é permitido inativar o proprietário principal (último owner) da empresa.",
        },
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_members")
    .update({ status: params.status } as never)
    .eq("id", params.membershipId)
    .eq("company_id", params.companyId);

  if (error) {
    return {
      data: null,
      error: { message: `Não foi possível atualizar o status: ${error.message}` },
    };
  }

  return { data: null, error: null };
}

export async function saveCompanyMemberPermissions(params: {
  companyId: string;
  membershipId: string;
  accessProfile: AccessProfileId;
  permissions: ModulePermissionState[];
}): Promise<Result<null>> {
  const authz = await assertCanManageCompanyUsers(params.companyId);
  if (!authz.ok || !authz.user) {
    return { data: null, error: { message: authz.message } };
  }

  if (!isAccessProfileId(params.accessProfile)) {
    return { data: null, error: { message: "Perfil de acesso inválido." } };
  }

  const targetResult = await loadMembershipTarget({
    companyId: params.companyId,
    membershipId: params.membershipId,
  });
  if (targetResult.error || !targetResult.data) {
    return { data: null, error: targetResult.error };
  }

  const target = targetResult.data;
  if (!isCompanyRole(target.role)) {
    return { data: null, error: { message: "Cargo do membro inválido." } };
  }

  const planResult = await loadCompanyPlanAndOverrides(params.companyId);
  if (planResult.error || planResult.data == null) {
    return {
      data: null,
      error:
        planResult.error ?? { message: "Plano da empresa indisponível." },
    };
  }

  const isPrimaryOwner = target.role === COMPANY_ROLES.owner;
  const normalized = normalizePermissionsPayload(params.permissions, {
    isPrimaryOwner,
    isSelf: isPrimaryOwner || target.user_id === authz.user.id,
    plan: planResult.data.plan,
    overrides: planResult.data.overrides,
  });
  if (normalized.error || !normalized.data) {
    return { data: null, error: normalized.error };
  }

  const nextRole = companyRoleForAccessProfile(
    params.accessProfile,
    target.role
  );

  // Owner inicial / proprietário: cargo permanece owner; perfil pode ser administrator/custom etc.
  if (isPrimaryOwner && nextRole !== COMPANY_ROLES.owner) {
    return {
      data: null,
      error: {
        message: "O proprietário principal não pode perder o cargo de owner.",
      },
    };
  }

  const supabase = await createClient();
  const { error: memberError } = await supabase
    .from("company_members")
    .update({
      access_profile: params.accessProfile,
      role: nextRole,
    } as never)
    .eq("id", params.membershipId)
    .eq("company_id", params.companyId);

  if (memberError) {
    return {
      data: null,
      error: {
        message: `Não foi possível atualizar o perfil: ${memberError.message}`,
      },
    };
  }

  return replaceMemberPermissions({
    companyId: params.companyId,
    membershipId: params.membershipId,
    permissions: normalized.data,
  });
}

export async function updateCompanyMemberBasics(params: {
  companyId: string;
  membershipId: string;
  userId: string;
  fullName: string;
  role: CompanyRole;
  status: UserStatus;
  accessProfile: AccessProfileId;
}): Promise<Result<{ updatedRole: boolean; updatedName: boolean; updatedStatus: boolean; updatedProfile: boolean }>> {
  const authz = await assertCanManageCompanyUsers(params.companyId);
  if (!authz.ok || !authz.user) {
    return { data: null, error: { message: authz.message } };
  }

  const fullName = params.fullName.trim();
  if (!fullName) {
    return { data: null, error: { message: "Informe o nome do usuário." } };
  }

  if (!isCompanyRole(params.role)) {
    return { data: null, error: { message: "Cargo inválido." } };
  }

  if (!isUserStatus(params.status)) {
    return { data: null, error: { message: "Status inválido." } };
  }

  if (!isAccessProfileId(params.accessProfile)) {
    return { data: null, error: { message: "Perfil de acesso inválido." } };
  }

  const supabase = await createClient();
  const { data: memberships, error: listError } = await supabase
    .from("company_members")
    .select("id, user_id, role, status, access_profile")
    .eq("company_id", params.companyId);

  if (listError) {
    return {
      data: null,
      error: { message: `Erro ao validar membros: ${listError.message}` },
    };
  }

  type MemberLite = {
    id: string;
    user_id: string;
    role: string;
    status: string;
    access_profile: string;
  };
  const rows = (memberships ?? []) as MemberLite[];
  const target = rows.find((row) => row.id === params.membershipId);

  if (!target || target.user_id !== params.userId) {
    return {
      data: null,
      error: { message: "Usuário não encontrado nesta empresa." },
    };
  }

  const activeOwners = rows.filter(
    (row) =>
      row.role === COMPANY_ROLES.owner &&
      row.status !== USER_STATUS.inactive
  );
  const isSoleOwner =
    target.role === COMPANY_ROLES.owner &&
    activeOwners.length === 1 &&
    activeOwners[0]?.id === target.id;

  if (isSoleOwner && params.role !== COMPANY_ROLES.owner) {
    return {
      data: null,
      error: {
        message:
          "O administrador principal não pode perder o cargo de proprietário.",
      },
    };
  }

  if (
    target.role === COMPANY_ROLES.owner &&
    params.role !== COMPANY_ROLES.owner &&
    authz.user.id === target.user_id
  ) {
    return {
      data: null,
      error: {
        message: "Você não pode remover o próprio cargo de proprietário.",
      },
    };
  }

  if (
    target.status !== USER_STATUS.active &&
    params.status === USER_STATUS.active
  ) {
    const { assertCompanyHasAvailableSeat } = await import("@/lib/plans/seats");
    const seatGate = await assertCompanyHasAvailableSeat({
      companyId: params.companyId,
      forReactivate: true,
    });
    if (!seatGate.ok) {
      return { data: null, error: { message: seatGate.message } };
    }
  }

  if (
    isSoleOwner &&
    target.status !== USER_STATUS.inactive &&
    params.status === USER_STATUS.inactive
  ) {
    return {
      data: null,
      error: {
        message:
          "Não é permitido inativar o proprietário principal (último owner) da empresa.",
      },
    };
  }

  let nextRole = params.role;
  if (target.role === COMPANY_ROLES.owner) {
    nextRole = COMPANY_ROLES.owner;
  } else if (nextRole === COMPANY_ROLES.owner) {
    return {
      data: null,
      error: {
        message:
          "Não é possível promover para proprietário por esta tela. Use o fluxo de Owner inicial.",
      },
    };
  } else {
    nextRole = companyRoleForAccessProfile(params.accessProfile, nextRole);
  }

  const memberPatch: {
    role?: CompanyRole;
    status?: UserStatus;
    access_profile?: AccessProfileId;
  } = {};

  let updatedRole = false;
  let updatedStatus = false;
  let updatedProfile = false;

  if (nextRole !== target.role) {
    memberPatch.role = nextRole;
    updatedRole = true;
  }
  if (params.status !== target.status) {
    memberPatch.status = params.status;
    updatedStatus = true;
  }
  if (params.accessProfile !== target.access_profile) {
    memberPatch.access_profile = params.accessProfile;
    updatedProfile = true;
  }

  if (Object.keys(memberPatch).length > 0) {
    const { error: memberError } = await supabase
      .from("company_members")
      .update(memberPatch as never)
      .eq("id", params.membershipId)
      .eq("company_id", params.companyId);

    if (memberError) {
      return {
        data: null,
        error: {
          message: `Não foi possível atualizar o membro: ${memberError.message}`,
        },
      };
    }
  }

  if (
    updatedProfile &&
    params.accessProfile !== ACCESS_PROFILES.custom
  ) {
    const planResult = await loadCompanyPlanAndOverrides(params.companyId);
    if (planResult.error || planResult.data == null) {
      return {
        data: null,
        error:
          planResult.error ?? { message: "Plano da empresa indisponível." },
      };
    }

    const isPrimaryOwner = target.role === COMPANY_ROLES.owner;
    const matrix = protectPrimaryOwnerPermissions(
      permissionsForProfileInCompany(
        params.accessProfile,
        planResult.data.plan,
        planResult.data.overrides
      ),
      {
        isPrimaryOwner,
        isSelf: isPrimaryOwner || target.user_id === authz.user.id,
      }
    ).map(applyViewDependency);

    const replaceResult = await replaceMemberPermissions({
      companyId: params.companyId,
      membershipId: params.membershipId,
      permissions: serializePermissionsForStorage(matrix),
    });
    if (replaceResult.error) {
      return { data: null, error: replaceResult.error };
    }
  }

  let updatedName = false;
  if (params.userId === authz.user.id) {
    const { error: nameError } = await supabase
      .from("profiles")
      .update({ full_name: fullName } as never)
      .eq("id", authz.user.id);

    if (nameError) {
      return {
        data: null,
        error: {
          message: `Não foi possível atualizar o nome: ${nameError.message}`,
        },
      };
    }
    updatedName = true;
  }

  return {
    data: { updatedRole, updatedName, updatedStatus, updatedProfile },
    error: null,
  };
}
