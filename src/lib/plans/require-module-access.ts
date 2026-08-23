import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_COMPANY_COOKIE,
  parseActiveCompanyMarker,
  resolveActiveCompanyId,
} from "@/lib/auth/active-company";
import { getUserCompanies } from "@/lib/auth/session";
import {
  buildModuleOverrideMap,
  modulesForCompany,
  normalizeCompanyPlan,
  permissionAllowsAction,
  resolveAllowedModules,
  resolveCreatableModules,
  resolveDeletableModules,
  resolveEditableModules,
  type CompanyModuleOverrides,
  type MemberAccessSnapshot,
  EMPTY_MODULE_OVERRIDES,
} from "@/lib/plans/access";
import { isModuleEntitledForCompany } from "@/lib/plans/company-entitlements";
import {
  ACCESS_PROFILES,
  isAccessProfileId,
  type PermissionAction,
  type PermissionModuleId,
} from "@/lib/users/permissions";

type PermissionRow = {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  scope: string;
};

async function loadPermissionRows(params: {
  companyId: string;
  membershipId: string;
}): Promise<PermissionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_permissions")
    .select(
      "module, can_view, can_create, can_edit, can_delete, can_export, scope"
    )
    .eq("company_id", params.companyId)
    .eq("membership_id", params.membershipId);

  if (error) {
    throw new Error(`Erro ao carregar permissões: ${error.message}`);
  }

  return (data ?? []) as PermissionRow[];
}

export async function loadCompanyModuleOverrides(
  companyId: string
): Promise<CompanyModuleOverrides> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_module_overrides")
    .select("module_key, enabled")
    .eq("company_id", companyId);

  if (error) {
    // Tabela ainda não migrada: fallback seguro = sem overrides (preset puro).
    if (
      error.message.includes("company_module_overrides") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return EMPTY_MODULE_OVERRIDES;
    }
    throw new Error(`Erro ao carregar overrides de módulos: ${error.message}`);
  }

  return buildModuleOverrideMap(
    (data ?? []) as Array<{ module_key: string; enabled: boolean }>
  );
}

/**
 * Resolve plano + módulos efetivos do usuário na empresa ativa (ou preferida).
 */
export async function resolveMemberAccessSnapshot(
  companyId?: string | null
): Promise<MemberAccessSnapshot | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { companies } = await getUserCompanies();
  if (companies.length === 0) return null;

  const cookieStore = await cookies();
  const preferred =
    companyId ??
    parseActiveCompanyMarker(cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value)
      ?.companyId ??
    null;

  const activeId = resolveActiveCompanyId(
    companies.map((c) => c.id),
    preferred
  );
  if (!activeId) return null;

  const company = companies.find((c) => c.id === activeId);
  if (!company) return null;

  const membership = company.membership as {
    id: string;
    role: string;
    access_profile?: string | null;
    status?: string | null;
  };

  const plan = normalizeCompanyPlan(company.plan);
  const accessProfile = isAccessProfileId(membership.access_profile ?? "")
    ? (membership.access_profile as string)
    : ACCESS_PROFILES.professional;

  const overrides = await loadCompanyModuleOverrides(activeId);
  const entitledModules = modulesForCompany(plan, overrides);

  // Membership inactive: sem módulos efetivos (não trata row como acesso ativo).
  if (membership.status === "inactive") {
    return {
      plan,
      role: membership.role,
      accessProfile,
      membershipId: membership.id,
      entitledModules,
      allowedModules: [],
      creatableModules: [],
      editableModules: [],
      deletableModules: [],
    };
  }

  const rows = await loadPermissionRows({
    companyId: activeId,
    membershipId: membership.id,
  });

  const allowed = resolveAllowedModules({
    plan,
    role: membership.role,
    accessProfile,
    permissionRows: rows,
    overrides,
  });

  const creatable = resolveCreatableModules({
    plan,
    role: membership.role,
    accessProfile,
    permissionRows: rows,
    overrides,
  });

  const editable = resolveEditableModules({
    plan,
    role: membership.role,
    accessProfile,
    permissionRows: rows,
    overrides,
  });

  const deletable = resolveDeletableModules({
    plan,
    role: membership.role,
    accessProfile,
    permissionRows: rows,
    overrides,
  });

  return {
    plan,
    role: membership.role,
    accessProfile,
    membershipId: membership.id,
    entitledModules,
    allowedModules: [...allowed],
    creatableModules: [...creatable],
    editableModules: [...editable],
    deletableModules: [...deletable],
  };
}

/**
 * Gate de página/rota: teto efetivo ∩ permissão de visualizar.
 * Sem acesso → 404 (mesmo padrão do Super Admin).
 */
export async function requireModuleAccess(
  module: PermissionModuleId
): Promise<MemberAccessSnapshot> {
  const snapshot = await resolveMemberAccessSnapshot();
  if (!snapshot || !snapshot.allowedModules.includes(module)) {
    notFound();
  }
  return snapshot;
}

/**
 * Valida se a empresa possui o módulo no teto efetivo (plan ⊕ overrides).
 * Mantém assinatura dos call sites; carrega overrides uma vez.
 */
export async function assertPlanEntitlement(params: {
  companyId: string;
  module: PermissionModuleId;
  /** Evita N+1 quando o caller já carregou overrides */
  overrides?: CompanyModuleOverrides;
}): Promise<
  | { ok: true; plan: string; overrides: CompanyModuleOverrides }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", params.companyId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data) {
    return { ok: false, message: "Empresa não encontrada." };
  }

  const plan = normalizeCompanyPlan((data as { plan?: string }).plan);
  const overrides =
    params.overrides ?? (await loadCompanyModuleOverrides(params.companyId));

  if (!isModuleEntitledForCompany(plan, params.module, overrides)) {
    return {
      ok: false,
      message: "Este módulo não está disponível no plano da empresa.",
    };
  }

  return { ok: true, plan, overrides };
}

/**
 * Valida teto efetivo + membership + permissão de ação no módulo.
 * Usar em server actions / APIs — não confiar na UI.
 */
export async function assertMemberPermission(params: {
  companyId: string;
  module: PermissionModuleId;
  action?: PermissionAction;
}): Promise<
  | { ok: true; snapshot: MemberAccessSnapshot }
  | { ok: false; message: string }
> {
  const action = params.action ?? "view";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sessão autenticada ausente." };
  }

  const planCheck = await assertPlanEntitlement({
    companyId: params.companyId,
    module: params.module,
  });
  if (!planCheck.ok) {
    return planCheck;
  }

  const { data: membership, error: memberError } = await supabase
    .from("company_members")
    .select("id, role, access_profile, status")
    .eq("company_id", params.companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    return { ok: false, message: memberError.message };
  }
  if (!membership) {
    return { ok: false, message: "Você não pertence a esta empresa." };
  }

  const member = membership as {
    id: string;
    role: string;
    access_profile: string;
    status?: string | null;
  };

  if (member.status === "inactive") {
    return { ok: false, message: "Sua conta está inativa nesta empresa." };
  }

  const plan = normalizeCompanyPlan(planCheck.plan);
  const overrides = planCheck.overrides;
  const rows = await loadPermissionRows({
    companyId: params.companyId,
    membershipId: member.id,
  });

  const row = rows.find((item) => item.module === params.module) ?? null;

  if (
    !permissionAllowsAction({
      plan,
      module: params.module,
      action,
      role: member.role,
      accessProfile: member.access_profile,
      overrides,
      row: row
        ? {
            module: row.module,
            can_view: row.can_view,
            can_create: row.can_create,
            can_edit: row.can_edit,
            can_delete: row.can_delete,
            can_export: row.can_export,
            scope: row.scope as import("@/lib/users/permissions").PermissionScope,
          }
        : null,
    })
  ) {
    return {
      ok: false,
      message: "Você não tem permissão para esta ação neste módulo.",
    };
  }

  const entitledModules = modulesForCompany(plan, overrides);

  const allowed = resolveAllowedModules({
    plan,
    role: member.role,
    accessProfile: member.access_profile,
    permissionRows: rows,
    overrides,
  });

  const creatable = resolveCreatableModules({
    plan,
    role: member.role,
    accessProfile: member.access_profile,
    permissionRows: rows,
    overrides,
  });

  const editable = resolveEditableModules({
    plan,
    role: member.role,
    accessProfile: member.access_profile,
    permissionRows: rows,
    overrides,
  });

  const deletable = resolveDeletableModules({
    plan,
    role: member.role,
    accessProfile: member.access_profile,
    permissionRows: rows,
    overrides,
  });

  return {
    ok: true,
    snapshot: {
      plan,
      role: member.role,
      accessProfile: member.access_profile,
      membershipId: member.id,
      entitledModules,
      allowedModules: [...allowed],
      creatableModules: [...creatable],
      editableModules: [...editable],
      deletableModules: [...deletable],
    },
  };
}
