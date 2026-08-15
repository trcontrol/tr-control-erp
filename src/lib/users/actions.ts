import { createClient } from "@/lib/supabase/client";
import { COMPANY_ROLES, type CompanyRole } from "@/lib/constants";
import {
  USER_STATUS,
  type UserStatus,
  normalizeUserSearch,
  type UserSortOption,
} from "@/lib/users/format";
import {
  type AccessProfileId,
  companyRoleForAccessProfile,
  deriveAccessProfileFromRole,
  isAccessProfileId,
} from "@/lib/users/permissions";
import type { Profile } from "@/types/database";

export { companyRoleForAccessProfile };

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

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
  status: string | null;
  access_profile: string | null;
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

function isUserStatus(value: string): value is UserStatus {
  return (
    value === USER_STATUS.active ||
    value === USER_STATUS.inactive ||
    value === USER_STATUS.pending
  );
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
  const status =
    row.status && isUserStatus(row.status) ? row.status : USER_STATUS.active;
  const accessProfile =
    row.access_profile && isAccessProfileId(row.access_profile)
      ? row.access_profile
      : deriveAccessProfileFromRole(role);

  return {
    id: row.id,
    membershipId: row.id,
    userId: row.user_id,
    fullName,
    email: currentUserEmailById.get(row.user_id) ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role,
    accessProfile,
    companyId: row.company_id,
    companyName,
    status,
    createdAt: row.created_at,
    isPrimaryOwner: role === COMPANY_ROLES.owner,
    isCurrentUser: row.user_id === currentUserId,
  };
}

export function computeUserKpis(
  users: CompanyUser[],
  pendingValidInvites = 0
): CompanyUserKpis {
  return {
    total: users.length,
    active: users.filter((user) => user.status === USER_STATUS.active).length,
    inactive: users.filter((user) => user.status === USER_STATUS.inactive)
      .length,
    pending: pendingValidInvites,
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
      status,
      access_profile,
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
