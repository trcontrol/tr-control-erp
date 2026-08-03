export type MockUserRole = "owner" | "admin" | "member";
export type MockUserStatus = "active" | "pending" | "inactive";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  role: MockUserRole;
  status: MockUserStatus;
  lastAccess: string;
};

export type MockUserInput = {
  name: string;
  email: string;
  role: MockUserRole;
  status: MockUserStatus;
};

export const ROLE_FILTER_OPTIONS: {
  value: MockUserRole | "all";
  label: string;
}[] = [
  { value: "all", label: "Todos os perfis" },
  { value: "owner", label: "Proprietário" },
  { value: "admin", label: "Administrador" },
  { value: "member", label: "Membro" },
];

export const ROLE_FORM_OPTIONS: { value: MockUserRole; label: string }[] = [
  { value: "owner", label: "Proprietário" },
  { value: "admin", label: "Administrador" },
  { value: "member", label: "Membro" },
];

export const STATUS_FILTER_OPTIONS: {
  value: MockUserStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "Todos os status" },
  { value: "active", label: "Ativo" },
  { value: "pending", label: "Pendente" },
  { value: "inactive", label: "Inativo" },
];

export const STATUS_FORM_OPTIONS: { value: MockUserStatus; label: string }[] = [
  { value: "active", label: "Ativo" },
  { value: "pending", label: "Pendente" },
  { value: "inactive", label: "Inativo" },
];

export const INITIAL_MOCK_USERS: MockUser[] = [
  {
    id: "1",
    name: "Ana Souza",
    email: "ana.souza@empresa.com",
    role: "owner",
    status: "active",
    lastAccess: "03/08/2026 às 14:22",
  },
  {
    id: "2",
    name: "Bruno Lima",
    email: "bruno.lima@empresa.com",
    role: "admin",
    status: "active",
    lastAccess: "03/08/2026 às 11:05",
  },
  {
    id: "3",
    name: "Carla Mendes",
    email: "carla.mendes@empresa.com",
    role: "admin",
    status: "active",
    lastAccess: "02/08/2026 às 18:40",
  },
  {
    id: "4",
    name: "Diego Ferreira",
    email: "diego.ferreira@empresa.com",
    role: "member",
    status: "active",
    lastAccess: "01/08/2026 às 09:15",
  },
  {
    id: "5",
    name: "Elena Costa",
    email: "elena.costa@empresa.com",
    role: "member",
    status: "pending",
    lastAccess: "Nunca acessou",
  },
  {
    id: "6",
    name: "Felipe Rocha",
    email: "felipe.rocha@empresa.com",
    role: "member",
    status: "pending",
    lastAccess: "Nunca acessou",
  },
  {
    id: "7",
    name: "Gabriela Nunes",
    email: "gabriela.nunes@empresa.com",
    role: "member",
    status: "inactive",
    lastAccess: "12/07/2026 às 16:50",
  },
];

export function roleLabel(role: MockUserRole) {
  return (
    ROLE_FORM_OPTIONS.find((item) => item.value === role)?.label ?? role
  );
}

export function statusLabel(status: MockUserStatus) {
  return (
    STATUS_FORM_OPTIONS.find((item) => item.value === status)?.label ?? status
  );
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isEmailTaken(
  users: MockUser[],
  email: string,
  excludeId?: string
) {
  const normalized = normalizeEmail(email);
  return users.some(
    (user) =>
      user.id !== excludeId && normalizeEmail(user.email) === normalized
  );
}

export function createMockUserId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function computeUserKpis(users: MockUser[]) {
  return {
    active: users.filter((user) => user.status === "active").length,
    administrators: users.filter(
      (user) => user.role === "owner" || user.role === "admin"
    ).length,
    pending: users.filter((user) => user.status === "pending").length,
    inactive: users.filter((user) => user.status === "inactive").length,
  };
}

export function nextStatusAfterToggle(status: MockUserStatus): MockUserStatus {
  return status === "active" ? "inactive" : "active";
}

export function toggleActionLabel(status: MockUserStatus) {
  return status === "active" ? "Inativar" : "Ativar";
}
