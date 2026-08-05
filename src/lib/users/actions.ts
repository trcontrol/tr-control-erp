import { createClient } from "@/lib/supabase/client";
import { COMPANY_ROLES, type CompanyRole } from "@/lib/constants";
import {
  USER_STATUS,
  type UserStatus,
  normalizeUserSearch,
  type UserSortOption,
} from "@/lib/users/format";
import {
  ACCESS_PROFILES,
  type AccessProfileId,
  deriveAccessProfileFromRole,
  type ModulePermissionState,
} from "@/lib/users/permissions";
import type { Profile } from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export const USERS_SCHEMA_REQUIRED =
  "Esta ação depende da migration de status, perfis e permissões. A interface já está pronta — autorize a migration para persistir.";

export type CompanyUser = {
  id: string;
  membershipId: string;
  userId: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  role: CompanyRole;
  accessProfile: AccessProfileId;
  companyId: string;
  companyName: string;
  status: UserStatus;
  createdAt: string;
  isPrimaryOwner: boolean;
  isCurrentUser: boolean;
};

export type CompanyUserKpis = {
  total: number;
  active: number;
  inactive: number;
  pending: number;
};

type ProfilePreview = Pick<
  Profile,
  "id" | "full_name" | "avatar_url" | "created_at"
>;

type MemberRow = {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile: ProfilePreview | ProfilePreview[] | null;
};

function normalizeProfile(
  profile: MemberRow["profile"]
): ProfilePreview | null {
  if (!profile) return null;
  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}

function isCompanyRole(value: string): value is CompanyRole {
  return (
    value === COMPANY_ROLES.owner ||
    value === COMPANY_ROLES.admin ||
    value === COMPANY_ROLES.member
  );
}

/**
 * Etapa 2 (sem migration): membros vinculados = ativos.
 * Status real virá com coluna dedicada.
 */
function deriveUserStatus(): UserStatus {
  return USER_STATUS.active;
}

function mapMemberToCompanyUser(
  row: MemberRow,
  companyName: string,
  currentUserEmailById: Map<string, string>,
  currentUserId: string
): CompanyUser {
  const profile = normalizeProfile(row.profile);
  const role = isCompanyRole(row.role) ? row.role : COMPANY_ROLES.member;
  const fullName =
    profile?.full_name?.trim() ||
    currentUserEmailById.get(row.user_id) ||
    "Usuário sem nome";

  return {
    id: row.id,
    membershipId: row.id,
    userId: row.user_id,
    fullName,
    email: currentUserEmailById.get(row.user_id) ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role,
    accessProfile: deriveAccessProfileFromRole(role),
    companyId: row.company_id,
    companyName,
    status: deriveUserStatus(),
    createdAt: row.created_at,
    isPrimaryOwner: role === COMPANY_ROLES.owner,
    isCurrentUser: row.user_id === currentUserId,
  };
}

export function computeUserKpis(users: CompanyUser[]): CompanyUserKpis {
  return {
    total: users.length,
    active: users.filter((user) => user.status === USER_STATUS.active).length,
    inactive: users.filter((user) => user.status === USER_STATUS.inactive)
      .length,
    pending: users.filter((user) => user.status === USER_STATUS.pending)
      .length,
  };
}

export function filterAndSortUsers(
  users: CompanyUser[],
  params: {
    search?: string;
    role?: CompanyRole | "all";
    status?: UserStatus | "all";
    sort?: UserSortOption;
  }
): CompanyUser[] {
  const query = normalizeUserSearch(params.search ?? "");
  const role = params.role ?? "all";
  const status = params.status ?? "all";
  const sort = params.sort ?? "name_asc";

  const filtered = users.filter((user) => {
    const matchesSearch =
      !query ||
      user.fullName.toLowerCase().includes(query) ||
      (user.email?.toLowerCase().includes(query) ?? false) ||
      user.companyName.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.accessProfile.toLowerCase().includes(query);

    const matchesRole = role === "all" || user.role === role;
    const matchesStatus = status === "all" || user.status === status;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const sorted = [...filtered];

  sorted.sort((a, b) => {
    if (sort === "name_asc" || sort === "name_desc") {
      const cmp = a.fullName.localeCompare(b.fullName, "pt-BR", {
        sensitivity: "base",
      });
      return sort === "name_asc" ? cmp : -cmp;
    }

    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    const cmp = aTime - bTime;
    return sort === "date_asc" ? cmp : -cmp;
  });

  return sorted;
}

export async function listCompanyUsers(params: {
  companyId: string;
  companyName: string;
}): Promise<Result<CompanyUser[]>> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return {
      data: null,
      error: { message: `Falha ao obter sessão: ${authError.message}` },
    };
  }

  if (!user) {
    return {
      data: null,
      error: { message: "Sessão autenticada ausente." },
    };
  }

  const { data, error } = await supabase
    .from("company_members")
    .select(
      `
      id,
      company_id,
      user_id,
      role,
      created_at,
      profile:profiles!company_members_user_id_fkey (
        id,
        full_name,
        avatar_url,
        created_at
      )
    `
    )
    .eq("company_id", params.companyId)
    .order("created_at", { ascending: true });

  if (error) {
    return {
      data: null,
      error: {
        message: `Erro ao carregar usuários da empresa: ${error.message}`,
      },
    };
  }

  const rows = (data ?? []) as MemberRow[];

  const emailByUserId = new Map<string, string>();
  if (user.email) {
    emailByUserId.set(user.id, user.email);
  }

  const users = rows.map((row) =>
    mapMemberToCompanyUser(row, params.companyName, emailByUserId, user.id)
  );

  return { data: users, error: null };
}

/**
 * Atualiza o que o schema atual permite com segurança:
 * - role em company_members (admin/member; protege último owner)
 * - full_name em profiles somente do próprio usuário (RLS atual)
 */
export async function updateCompanyMemberBasics(params: {
  companyId: string;
  membershipId: string;
  userId: string;
  fullName: string;
  role: CompanyRole;
}): Promise<Result<{ updatedRole: boolean; updatedName: boolean }>> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      data: null,
      error: { message: "Sessão autenticada ausente." },
    };
  }

  const fullName = params.fullName.trim();
  if (!fullName) {
    return { data: null, error: { message: "Informe o nome do usuário." } };
  }

  const { data: memberships, error: listError } = await supabase
    .from("company_members")
    .select("id, user_id, role")
    .eq("company_id", params.companyId);

  if (listError) {
    return {
      data: null,
      error: { message: `Erro ao validar membros: ${listError.message}` },
    };
  }

  type MemberLite = { id: string; user_id: string; role: string };
  const rows = (memberships ?? []) as MemberLite[];
  const target = rows.find((row) => row.id === params.membershipId);

  if (!target) {
    return {
      data: null,
      error: { message: "Usuário não encontrado nesta empresa." },
    };
  }

  const owners = rows.filter((row) => row.role === COMPANY_ROLES.owner);
  const isSoleOwner =
    target.role === COMPANY_ROLES.owner && owners.length === 1;

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
    user.id === target.user_id
  ) {
    return {
      data: null,
      error: {
        message: "Você não pode remover o próprio cargo de proprietário.",
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
          "Não é possível promover para proprietário por esta tela. Use o vínculo existente.",
      },
    };
  }

  let updatedRole = false;
  if (nextRole !== target.role) {
    const { error: roleError } = await supabase
      .from("company_members")
      .update({ role: nextRole } as never)
      .eq("id", params.membershipId)
      .eq("company_id", params.companyId);

    if (roleError) {
      return {
        data: null,
        error: {
          message: `Não foi possível atualizar o cargo: ${roleError.message}`,
        },
      };
    }
    updatedRole = true;
  }

  let updatedName = false;
  if (params.userId === user.id) {
    const { error: nameError } = await supabase
      .from("profiles")
      .update({ full_name: fullName } as never)
      .eq("id", user.id);

    if (nameError) {
      return {
        data: null,
        error: {
          message: `Não foi possível atualizar o nome: ${nameError.message}`,
        },
      };
    }
    updatedName = true;
  } else {
    // RLS atual só permite atualizar o próprio profile.
    // Nome de terceiros ficará para migration/admin path.
  }

  return {
    data: { updatedRole, updatedName },
    error: null,
  };
}

export async function inviteCompanyUser(params: {
  companyId: string;
  fullName: string;
  email: string;
  role: CompanyRole;
  accessProfile: AccessProfileId;
  permissions: ModulePermissionState[];
}): Promise<Result<null>> {
  // Mantém o payload preparado (inclui permissões) para a futura integração
  // Auth Admin + migration 024. Sem persistência enquanto a migration não rodar.
  void params;
  return {
    data: null,
    error: {
      message: `${USERS_SCHEMA_REQUIRED} Também será necessário o fluxo de convite via Auth Admin.`,
    },
  };
}

export async function updateCompanyMemberStatus(_params: {
  companyId: string;
  membershipId: string;
  status: UserStatus;
}): Promise<Result<null>> {
  void _params;
  return {
    data: null,
    error: { message: USERS_SCHEMA_REQUIRED },
  };
}

export async function saveCompanyMemberPermissions(_params: {
  companyId: string;
  membershipId: string;
  accessProfile: AccessProfileId;
  permissions: ModulePermissionState[];
}): Promise<Result<null>> {
  void _params;
  return {
    data: null,
    error: { message: USERS_SCHEMA_REQUIRED },
  };
}

/** Mapeia perfil de acesso → role persistível no enum atual. */
export function companyRoleForAccessProfile(
  profile: AccessProfileId,
  currentRole: CompanyRole
): CompanyRole {
  if (currentRole === COMPANY_ROLES.owner) return COMPANY_ROLES.owner;
  if (profile === ACCESS_PROFILES.administrator) return COMPANY_ROLES.admin;
  return COMPANY_ROLES.member;
}
