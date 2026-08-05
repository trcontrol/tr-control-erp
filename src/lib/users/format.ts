import { COMPANY_ROLES, type CompanyRole } from "@/lib/constants";

export const USER_STATUS = {
  active: "active",
  inactive: "inactive",
  pending: "pending",
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const USER_STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: USER_STATUS.active, label: "Ativo" },
  { value: USER_STATUS.inactive, label: "Inativo" },
  { value: USER_STATUS.pending, label: "Convite pendente" },
];

export const USER_STATUS_FILTER_OPTIONS: {
  value: UserStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "Todos os status" },
  ...USER_STATUS_OPTIONS,
];

export const USER_ROLE_FILTER_OPTIONS: {
  value: CompanyRole | "all";
  label: string;
}[] = [
  { value: "all", label: "Todos os cargos" },
  { value: COMPANY_ROLES.owner, label: "Proprietário" },
  { value: COMPANY_ROLES.admin, label: "Administrador" },
  { value: COMPANY_ROLES.member, label: "Membro" },
];

export type UserSortOption = "name_asc" | "name_desc" | "date_desc" | "date_asc";

export const USER_SORT_OPTIONS: { value: UserSortOption; label: string }[] = [
  { value: "name_asc", label: "Nome (A-Z)" },
  { value: "name_desc", label: "Nome (Z-A)" },
  { value: "date_desc", label: "Mais recentes" },
  { value: "date_asc", label: "Mais antigos" },
];

export const USERS_PAGE_SIZE = 8;

export function userRoleLabel(role: string) {
  if (role === COMPANY_ROLES.owner) return "Proprietário";
  if (role === COMPANY_ROLES.admin) return "Administrador";
  if (role === COMPANY_ROLES.member) return "Membro";
  return role;
}

export function userStatusLabel(status: UserStatus) {
  return (
    USER_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
  );
}

export function formatUserDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function userInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function normalizeUserSearch(value: string) {
  return value.trim().toLowerCase();
}
