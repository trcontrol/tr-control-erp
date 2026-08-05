export const ACCESS_PROFILES = {
  administrator: "administrator",
  manager: "manager",
  professional: "professional",
  attendant: "attendant",
  custom: "custom",
} as const;

export type AccessProfileId =
  (typeof ACCESS_PROFILES)[keyof typeof ACCESS_PROFILES];

export const ACCESS_PROFILE_OPTIONS: {
  value: AccessProfileId;
  label: string;
  description: string;
}[] = [
  {
    value: ACCESS_PROFILES.administrator,
    label: "Administrador",
    description: "Acesso total a todos os módulos",
  },
  {
    value: ACCESS_PROFILES.manager,
    label: "Gestor",
    description: "Gestão operacional sem exclusões críticas",
  },
  {
    value: ACCESS_PROFILES.professional,
    label: "Profissional",
    description: "Operação do dia a dia com edições",
  },
  {
    value: ACCESS_PROFILES.attendant,
    label: "Atendente",
    description: "Atendimento e registros básicos",
  },
  {
    value: ACCESS_PROFILES.custom,
    label: "Personalizado",
    description: "Permissões definidas manualmente",
  },
];

export const PERMISSION_ACTIONS = {
  view: "view",
  create: "create",
  edit: "edit",
  delete: "delete",
  export: "export",
} as const;

export type PermissionAction =
  (typeof PERMISSION_ACTIONS)[keyof typeof PERMISSION_ACTIONS];

export const PERMISSION_SCOPES = {
  all: "all",
  own: "own",
  own_agenda: "own_agenda",
  team: "team",
} as const;

export type PermissionScope =
  (typeof PERMISSION_SCOPES)[keyof typeof PERMISSION_SCOPES];

export const PERMISSION_SCOPE_OPTIONS: {
  value: PermissionScope;
  label: string;
}[] = [
  { value: PERMISSION_SCOPES.all, label: "Todos os registros" },
  { value: PERMISSION_SCOPES.own, label: "Apenas registros próprios" },
  { value: PERMISSION_SCOPES.own_agenda, label: "Apenas a própria agenda" },
  { value: PERMISSION_SCOPES.team, label: "Registros da equipe" },
];

export const PERMISSION_MODULES = {
  dashboard: "dashboard",
  agenda: "agenda",
  customers: "customers",
  suppliers: "suppliers",
  products: "products",
  stock: "stock",
  purchases: "purchases",
  funnel: "funnel",
  sales: "sales",
  finance: "finance",
  cashFlow: "cash_flow",
  tasks: "tasks",
  reports: "reports",
  settings: "settings",
  users: "users",
} as const;

export type PermissionModuleId =
  (typeof PERMISSION_MODULES)[keyof typeof PERMISSION_MODULES];

export type PermissionModuleConfig = {
  id: PermissionModuleId;
  label: string;
  supportsExport: boolean;
  scopes: PermissionScope[];
};

export const PERMISSION_MODULE_CATALOG: PermissionModuleConfig[] = [
  {
    id: PERMISSION_MODULES.dashboard,
    label: "Dashboard",
    supportsExport: false,
    scopes: [PERMISSION_SCOPES.all],
  },
  {
    id: PERMISSION_MODULES.agenda,
    label: "Agenda",
    supportsExport: false,
    scopes: [
      PERMISSION_SCOPES.all,
      PERMISSION_SCOPES.own_agenda,
      PERMISSION_SCOPES.team,
    ],
  },
  {
    id: PERMISSION_MODULES.customers,
    label: "Clientes",
    supportsExport: true,
    scopes: [PERMISSION_SCOPES.all, PERMISSION_SCOPES.own, PERMISSION_SCOPES.team],
  },
  {
    id: PERMISSION_MODULES.suppliers,
    label: "Fornecedores",
    supportsExport: true,
    scopes: [PERMISSION_SCOPES.all, PERMISSION_SCOPES.own],
  },
  {
    id: PERMISSION_MODULES.products,
    label: "Produtos",
    supportsExport: true,
    scopes: [PERMISSION_SCOPES.all],
  },
  {
    id: PERMISSION_MODULES.stock,
    label: "Estoque",
    supportsExport: true,
    scopes: [PERMISSION_SCOPES.all],
  },
  {
    id: PERMISSION_MODULES.purchases,
    label: "Compras",
    supportsExport: true,
    scopes: [PERMISSION_SCOPES.all, PERMISSION_SCOPES.own],
  },
  {
    id: PERMISSION_MODULES.funnel,
    label: "Funil Comercial",
    supportsExport: true,
    scopes: [PERMISSION_SCOPES.all, PERMISSION_SCOPES.own, PERMISSION_SCOPES.team],
  },
  {
    id: PERMISSION_MODULES.sales,
    label: "Vendas",
    supportsExport: true,
    scopes: [PERMISSION_SCOPES.all, PERMISSION_SCOPES.own, PERMISSION_SCOPES.team],
  },
  {
    id: PERMISSION_MODULES.finance,
    label: "Financeiro",
    supportsExport: true,
    scopes: [PERMISSION_SCOPES.all],
  },
  {
    id: PERMISSION_MODULES.cashFlow,
    label: "Fluxo de Caixa",
    supportsExport: true,
    scopes: [PERMISSION_SCOPES.all],
  },
  {
    id: PERMISSION_MODULES.tasks,
    label: "Tarefas",
    supportsExport: false,
    scopes: [PERMISSION_SCOPES.all, PERMISSION_SCOPES.own, PERMISSION_SCOPES.team],
  },
  {
    id: PERMISSION_MODULES.reports,
    label: "Relatórios",
    supportsExport: true,
    scopes: [PERMISSION_SCOPES.all],
  },
  {
    id: PERMISSION_MODULES.settings,
    label: "Configurações",
    supportsExport: false,
    scopes: [PERMISSION_SCOPES.all],
  },
  {
    id: PERMISSION_MODULES.users,
    label: "Usuários",
    supportsExport: false,
    scopes: [PERMISSION_SCOPES.all],
  },
];

export type ModulePermissionState = {
  module: PermissionModuleId;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  scope: PermissionScope;
};

export function accessProfileLabel(profile: AccessProfileId) {
  return (
    ACCESS_PROFILE_OPTIONS.find((item) => item.value === profile)?.label ??
    profile
  );
}

export function createEmptyModulePermission(
  module: PermissionModuleConfig
): ModulePermissionState {
  return {
    module: module.id,
    view: false,
    create: false,
    edit: false,
    delete: false,
    export: false,
    scope: module.scopes[0] ?? PERMISSION_SCOPES.all,
  };
}

export function createFullModulePermission(
  module: PermissionModuleConfig
): ModulePermissionState {
  return {
    module: module.id,
    view: true,
    create: true,
    edit: true,
    delete: true,
    export: module.supportsExport,
    scope: PERMISSION_SCOPES.all,
  };
}

export function createReadOnlyModulePermission(
  module: PermissionModuleConfig
): ModulePermissionState {
  return {
    module: module.id,
    view: true,
    create: false,
    edit: false,
    delete: false,
    export: false,
    scope: module.scopes.includes(PERMISSION_SCOPES.own_agenda)
      ? PERMISSION_SCOPES.own_agenda
      : module.scopes.includes(PERMISSION_SCOPES.own)
        ? PERMISSION_SCOPES.own
        : PERMISSION_SCOPES.all,
  };
}

/** Presets de interface — a persistência depende da migration futura. */
export function permissionsForProfile(
  profile: AccessProfileId
): ModulePermissionState[] {
  return PERMISSION_MODULE_CATALOG.map((module) => {
    if (profile === ACCESS_PROFILES.administrator) {
      return createFullModulePermission(module);
    }

    if (profile === ACCESS_PROFILES.manager) {
      const base = createFullModulePermission(module);
      if (
        module.id === PERMISSION_MODULES.settings ||
        module.id === PERMISSION_MODULES.users
      ) {
        return { ...base, delete: false };
      }
      if (
        module.id === PERMISSION_MODULES.finance ||
        module.id === PERMISSION_MODULES.cashFlow
      ) {
        return { ...base, delete: false };
      }
      return base;
    }

    if (profile === ACCESS_PROFILES.professional) {
      if (
        module.id === PERMISSION_MODULES.settings ||
        module.id === PERMISSION_MODULES.users ||
        module.id === PERMISSION_MODULES.finance ||
        module.id === PERMISSION_MODULES.cashFlow
      ) {
        return createEmptyModulePermission(module);
      }
      if (module.id === PERMISSION_MODULES.reports) {
        return createReadOnlyModulePermission(module);
      }
      return {
        ...createFullModulePermission(module),
        delete: false,
        scope: module.scopes.includes(PERMISSION_SCOPES.own)
          ? PERMISSION_SCOPES.own
          : module.scopes[0] ?? PERMISSION_SCOPES.all,
      };
    }

    if (profile === ACCESS_PROFILES.attendant) {
      if (
        module.id === PERMISSION_MODULES.customers ||
        module.id === PERMISSION_MODULES.agenda ||
        module.id === PERMISSION_MODULES.tasks ||
        module.id === PERMISSION_MODULES.funnel ||
        module.id === PERMISSION_MODULES.dashboard
      ) {
        return {
          ...createReadOnlyModulePermission(module),
          create: module.id !== PERMISSION_MODULES.dashboard,
          edit: module.id !== PERMISSION_MODULES.dashboard,
          scope:
            module.id === PERMISSION_MODULES.agenda
              ? PERMISSION_SCOPES.own_agenda
              : module.scopes.includes(PERMISSION_SCOPES.own)
                ? PERMISSION_SCOPES.own
                : PERMISSION_SCOPES.all,
        };
      }
      return createEmptyModulePermission(module);
    }

    // personalizado: parte de leitura nos módulos operacionais
    if (
      module.id === PERMISSION_MODULES.settings ||
      module.id === PERMISSION_MODULES.users
    ) {
      return createEmptyModulePermission(module);
    }
    return createReadOnlyModulePermission(module);
  });
}

export function applyViewDependency(
  permission: ModulePermissionState
): ModulePermissionState {
  if (permission.view) return permission;
  return {
    ...permission,
    create: false,
    edit: false,
    delete: false,
    export: false,
  };
}

export function setPermissionAction(
  permission: ModulePermissionState,
  action: PermissionAction,
  enabled: boolean,
  supportsExport: boolean
): ModulePermissionState {
  if (action === PERMISSION_ACTIONS.view) {
    return applyViewDependency({ ...permission, view: enabled });
  }

  if (action === PERMISSION_ACTIONS.export && !supportsExport) {
    return permission;
  }

  // Evita computed key com a palavra reservada "export" (instável no webpack/SWC).
  const next: ModulePermissionState = { ...permission };

  if (action === PERMISSION_ACTIONS.create) next.create = enabled;
  if (action === PERMISSION_ACTIONS.edit) next.edit = enabled;
  if (action === PERMISSION_ACTIONS.delete) next.delete = enabled;
  if (action === PERMISSION_ACTIONS.export) next.export = enabled;

  // Criar/Editar/Excluir/Exportar exigem Visualizar automaticamente.
  if (enabled) {
    next.view = true;
  }

  return next;
}

export function summarizeEnabledModules(
  permissions: ModulePermissionState[]
): Array<{
  module: PermissionModuleId;
  label: string;
  actions: string[];
  scope: PermissionScope;
}> {
  return permissions
    .filter((permission) => permission.view)
    .map((permission) => {
      const moduleConfig = PERMISSION_MODULE_CATALOG.find(
        (item) => item.id === permission.module
      );
      const actions: string[] = ["Visualizar"];
      if (permission.create) actions.push("Criar");
      if (permission.edit) actions.push("Editar");
      if (permission.delete) actions.push("Excluir");
      if (permission.export) actions.push("Exportar");

      return {
        module: permission.module,
        label: moduleConfig?.label ?? permission.module,
        actions,
        scope: permission.scope,
      };
    });
}

export function dominantPermissionScope(
  permissions: ModulePermissionState[]
): PermissionScope {
  const enabled = permissions.filter((item) => item.view);
  if (enabled.length === 0) return PERMISSION_SCOPES.all;

  const counts = new Map<PermissionScope, number>();
  for (const item of enabled) {
    counts.set(item.scope, (counts.get(item.scope) ?? 0) + 1);
  }

  let best: PermissionScope = enabled[0].scope;
  let bestCount = 0;
  for (const [scope, count] of counts) {
    if (count > bestCount) {
      best = scope;
      bestCount = count;
    }
  }
  return best;
}

export function applyFullAccess(): ModulePermissionState[] {
  return PERMISSION_MODULE_CATALOG.map(createFullModulePermission);
}

export function applyReadOnlyAccess(): ModulePermissionState[] {
  return PERMISSION_MODULE_CATALOG.map(createReadOnlyModulePermission);
}

export function isCriticalOwnerModule(module: PermissionModuleId) {
  return (
    module === PERMISSION_MODULES.users ||
    module === PERMISSION_MODULES.settings
  );
}

/**
 * Administrador principal (owner) não pode perder Visualizar em Usuários/Configurações.
 */
export function protectPrimaryOwnerPermissions(
  permissions: ModulePermissionState[],
  options: { isPrimaryOwner: boolean; isSelf: boolean }
): ModulePermissionState[] {
  if (!options.isPrimaryOwner || !options.isSelf) return permissions;

  return permissions.map((permission) => {
    if (!isCriticalOwnerModule(permission.module)) return permission;
    return {
      ...permission,
      view: true,
    };
  });
}

export function deriveAccessProfileFromRole(role: string): AccessProfileId {
  if (role === "owner" || role === "admin") {
    return ACCESS_PROFILES.administrator;
  }
  return ACCESS_PROFILES.professional;
}
