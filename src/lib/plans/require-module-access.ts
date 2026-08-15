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
  normalizeCompanyPlan,
  permissionAllowsAction,
  resolveAllowedModules,
  resolveCreatableModules,
  resolveDeletableModules,
  resolveEditableModules,
  type MemberAccessSnapshot,
} from "@/lib/plans/access";
import { isModuleEntitled } from "@/lib/plans/entitlements";
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

  // Membership inactive: sem módulos efetivos (não trata row como acesso ativo).
  if (membership.status === "inactive") {
    return {
      plan,
      role: membership.role,
      accessProfile,
      membershipId: membership.id,
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
  });

  const creatable = resolveCreatableModules({
    plan,
    role: membership.role,
    accessProfile,
    permissionRows: rows,
  });

  const editable = resolveEditableModules({
    plan,
    role: membership.role,
    accessProfile,
    permissionRows: rows,
  });

  const deletable = resolveDeletableModules({
    plan,
    role: membership.role,
    accessProfile,
    permissionRows: rows,
  });

  return {
    plan,
    role: membership.role,
    accessProfile,
    membershipId: membership.id,
    allowedModules: [...allowed],
    creatableModules: [...creatable],
    editableModules: [...editable],
    deletableModules: [...deletable],
  };
}

/**
 * Gate de página/rota: plano ∩ permissão de visualizar.
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

/** Valida apenas se o plano da empresa inclui o módulo. */
export async function assertPlanEntitlement(params: {
  companyId: string;
  module: PermissionModuleId;
}): Promise<{ ok: true; plan: string } | { ok: false; message: string }> {
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
  if (!isModuleEntitled(plan, params.module)) {
    return {
      ok: false,
      message: "Este módulo não está disponível no plano da empresa.",
    };
  }

  return { ok: true, plan };
}

/**
 * Valida plano + membership + permissão de ação no módulo.
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

  const allowed = resolveAllowedModules({
    plan,
    role: member.role,
    accessProfile: member.access_profile,
    permissionRows: rows,
  });

  const creatable = resolveCreatableModules({
    plan,
    role: member.role,
    accessProfile: member.access_profile,
    permissionRows: rows,
  });

  const editable = resolveEditableModules({
    plan,
    role: member.role,
    accessProfile: member.access_profile,
    permissionRows: rows,
  });

  const deletable = resolveDeletableModules({
    plan,
    role: member.role,
    accessProfile: member.access_profile,
    permissionRows: rows,
  });

  return {
    ok: true,
    snapshot: {
      plan,
      role: member.role,
      accessProfile: member.access_profile,
      membershipId: member.id,
      allowedModules: [...allowed],
      creatableModules: [...creatable],
      editableModules: [...editable],
      deletableModules: [...deletable],
    },
  };
}
