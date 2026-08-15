import { COMPANY_ROLES, type CompanyPlan } from "@/lib/constants";
import {
  createEmptyModulePermission,
  PERMISSION_MODULE_CATALOG,
  type AccessProfileId,
  type ModulePermissionState,
  type PermissionAction,
  type PermissionModuleId,
  type PersistedModulePermission,
  ACCESS_PROFILES,
  permissionsForProfile,
} from "@/lib/users/permissions";
import {
  entitledModuleSet,
  isModuleEntitled,
} from "@/lib/plans/entitlements";

export {
  isModuleEntitled,
  modulesForPlan,
  normalizeCompanyPlan,
  entitledModuleSet,
  isPlanUpgrade,
  isPlanDowngrade,
} from "@/lib/plans/entitlements";

/** Owner ou perfil administrator: acesso máximo DENTRO do plano (não bypassa plano). */
export function hasFullPlanAccess(params: {
  role: string | null | undefined;
  accessProfile: string | null | undefined;
}): boolean {
  if (params.role === COMPANY_ROLES.owner) return true;
  if (params.accessProfile === ACCESS_PROFILES.administrator) return true;
  return false;
}

/** Preset do perfil ∩ módulos do plano. */
export function permissionsForProfileInPlan(
  profile: AccessProfileId,
  plan: CompanyPlan | string | null | undefined
): ModulePermissionState[] {
  const entitled = entitledModuleSet(plan);
  return permissionsForProfile(profile)
    .filter((row) => entitled.has(row.module))
    .map((row) => {
      const config = PERMISSION_MODULE_CATALOG.find((m) => m.id === row.module);
      if (!config) return row;
      // Módulos no catálogo mas fora do plano já filtrados; mantém estado.
      return row;
    });
}

/** Zera / remove permissões de módulos fora do plano (para UI). */
export function intersectPermissionsWithPlan(
  permissions: ModulePermissionState[],
  plan: CompanyPlan | string | null | undefined
): ModulePermissionState[] {
  const entitled = entitledModuleSet(plan);
  const byModule = new Map(permissions.map((p) => [p.module, p]));

  return PERMISSION_MODULE_CATALOG.filter((m) => entitled.has(m.id)).map(
    (config) => {
      const existing = byModule.get(config.id);
      if (existing) return existing;
      return createEmptyModulePermission(config);
    }
  );
}

export function catalogModulesForPlan(
  plan: CompanyPlan | string | null | undefined
) {
  const entitled = entitledModuleSet(plan);
  return PERMISSION_MODULE_CATALOG.filter((m) => entitled.has(m.id));
}

/**
 * Valida payload antes de persistir member_permissions / invites.
 * Rejeita qualquer módulo fora do plano (não confiar no client).
 */
export function assertPermissionsWithinPlan(
  permissions: Array<{ module: string }>,
  plan: CompanyPlan | string | null | undefined
): { ok: true } | { ok: false; message: string } {
  const entitled = entitledModuleSet(plan);
  for (const row of permissions) {
    const moduleId = row.module as PermissionModuleId;
    if (!entitled.has(moduleId)) {
      return {
        ok: false,
        message: `O módulo "${row.module}" não está disponível no plano contratado.`,
      };
    }
  }
  return { ok: true };
}

export function canViewModule(params: {
  plan: CompanyPlan | string | null | undefined;
  module: PermissionModuleId;
  role: string | null | undefined;
  accessProfile: string | null | undefined;
  /** can_view da row member_permissions; ignorado se full plan access */
  permissionView?: boolean | null;
}): boolean {
  if (!isModuleEntitled(params.plan, params.module)) return false;
  if (
    hasFullPlanAccess({
      role: params.role,
      accessProfile: params.accessProfile,
    })
  ) {
    return true;
  }
  return params.permissionView === true;
}

export function resolveAllowedModules(params: {
  plan: CompanyPlan | string | null | undefined;
  role: string | null | undefined;
  accessProfile: string | null | undefined;
  permissionRows: Array<{ module: string; can_view: boolean }>;
}): Set<PermissionModuleId> {
  const entitled = entitledModuleSet(params.plan);
  const allowed = new Set<PermissionModuleId>();

  if (
    hasFullPlanAccess({
      role: params.role,
      accessProfile: params.accessProfile,
    })
  ) {
    for (const moduleId of entitled) allowed.add(moduleId);
    return allowed;
  }

  const viewByModule = new Map(
    params.permissionRows.map((row) => [row.module, row.can_view])
  );

  for (const moduleId of entitled) {
    if (viewByModule.get(moduleId) === true) {
      allowed.add(moduleId);
    }
  }

  return allowed;
}

/** Módulos com permissão de criar (plano ∩ can_create; owner/admin = todos do plano). */
export function resolveCreatableModules(params: {
  plan: CompanyPlan | string | null | undefined;
  role: string | null | undefined;
  accessProfile: string | null | undefined;
  permissionRows: Array<{
    module: string;
    can_view: boolean;
    can_create: boolean;
  }>;
}): Set<PermissionModuleId> {
  return resolveModulesForFlag({
    ...params,
    flag: "can_create",
  });
}

/** Módulos com permissão de editar (plano ∩ can_edit; owner/admin = todos do plano). */
export function resolveEditableModules(params: {
  plan: CompanyPlan | string | null | undefined;
  role: string | null | undefined;
  accessProfile: string | null | undefined;
  permissionRows: Array<{
    module: string;
    can_view: boolean;
    can_edit: boolean;
  }>;
}): Set<PermissionModuleId> {
  return resolveModulesForFlag({
    ...params,
    flag: "can_edit",
  });
}

/** Módulos com permissão de excluir (plano ∩ can_delete; owner/admin = todos do plano). */
export function resolveDeletableModules(params: {
  plan: CompanyPlan | string | null | undefined;
  role: string | null | undefined;
  accessProfile: string | null | undefined;
  permissionRows: Array<{
    module: string;
    can_view: boolean;
    can_delete: boolean;
  }>;
}): Set<PermissionModuleId> {
  return resolveModulesForFlag({
    ...params,
    flag: "can_delete",
  });
}

function resolveModulesForFlag(params: {
  plan: CompanyPlan | string | null | undefined;
  role: string | null | undefined;
  accessProfile: string | null | undefined;
  permissionRows: Array<{
    module: string;
    can_view: boolean;
    can_create?: boolean;
    can_edit?: boolean;
    can_delete?: boolean;
  }>;
  flag: "can_create" | "can_edit" | "can_delete";
}): Set<PermissionModuleId> {
  const entitled = entitledModuleSet(params.plan);
  const result = new Set<PermissionModuleId>();

  if (
    hasFullPlanAccess({
      role: params.role,
      accessProfile: params.accessProfile,
    })
  ) {
    for (const moduleId of entitled) result.add(moduleId);
    return result;
  }

  for (const row of params.permissionRows) {
    const moduleId = row.module as PermissionModuleId;
    if (
      entitled.has(moduleId) &&
      row.can_view === true &&
      row[params.flag] === true
    ) {
      result.add(moduleId);
    }
  }

  return result;
}

export type MemberAccessSnapshot = {
  plan: CompanyPlan;
  role: string;
  accessProfile: string;
  membershipId: string;
  allowedModules: PermissionModuleId[];
  /** Módulos em que o usuário pode criar (atalhos "Novo …") */
  creatableModules: PermissionModuleId[];
  /** Módulos em que o usuário pode editar */
  editableModules: PermissionModuleId[];
  /** Módulos em que o usuário pode excluir */
  deletableModules: PermissionModuleId[];
};

export function permissionAllowsAction(params: {
  plan: CompanyPlan | string | null | undefined;
  module: PermissionModuleId;
  action: PermissionAction;
  role: string | null | undefined;
  accessProfile: string | null | undefined;
  row: PersistedModulePermission | ModulePermissionState | null | undefined;
}): boolean {
  if (!isModuleEntitled(params.plan, params.module)) return false;

  if (
    hasFullPlanAccess({
      role: params.role,
      accessProfile: params.accessProfile,
    })
  ) {
    return true;
  }

  const row = params.row as
    | PersistedModulePermission
    | ModulePermissionState
    | null
    | undefined;

  if (!row) return false;

  const view =
    "can_view" in row ? Boolean(row.can_view) : Boolean(row.view);
  if (!view) return false;

  switch (params.action) {
    case "view":
      return true;
    case "create":
      return "can_create" in row
        ? Boolean(row.can_create)
        : Boolean(row.create);
    case "edit":
      return "can_edit" in row ? Boolean(row.can_edit) : Boolean(row.edit);
    case "delete":
      return "can_delete" in row
        ? Boolean(row.can_delete)
        : Boolean(row.delete);
    case "export":
      return "can_export" in row
        ? Boolean(row.can_export)
        : Boolean(row.export);
    default:
      return false;
  }
}
