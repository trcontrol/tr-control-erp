/**
 * Capabilities do Dashboard Executivo — alinhadas a plan entitlements +
 * member_permissions (mesma fonte da sidebar). Sem matriz duplicada.
 */
import {
  PERMISSION_MODULES,
  type PermissionModuleId,
} from "@/lib/users/permissions";

export const DASHBOARD_SECTIONS = {
  finance: "finance",
  sales: "sales",
  purchases: "purchases",
  stock: "stock",
  cashFlow: "cash_flow",
  shortcuts: "shortcuts",
  tasks: "tasks",
  funnel: "funnel",
  agenda: "agenda",
  customers: "customers",
  products: "products",
} as const;

export type DashboardSection =
  (typeof DASHBOARD_SECTIONS)[keyof typeof DASHBOARD_SECTIONS];

/** Seção do dashboard → módulo comercial (PERMISSION_MODULES). */
export const DASHBOARD_SECTION_MODULE: Partial<
  Record<DashboardSection, PermissionModuleId>
> = {
  [DASHBOARD_SECTIONS.finance]: PERMISSION_MODULES.finance,
  [DASHBOARD_SECTIONS.sales]: PERMISSION_MODULES.sales,
  [DASHBOARD_SECTIONS.purchases]: PERMISSION_MODULES.purchases,
  [DASHBOARD_SECTIONS.stock]: PERMISSION_MODULES.stock,
  [DASHBOARD_SECTIONS.cashFlow]: PERMISSION_MODULES.cashFlow,
  [DASHBOARD_SECTIONS.tasks]: PERMISSION_MODULES.tasks,
  [DASHBOARD_SECTIONS.funnel]: PERMISSION_MODULES.funnel,
  [DASHBOARD_SECTIONS.agenda]: PERMISSION_MODULES.agenda,
  [DASHBOARD_SECTIONS.customers]: PERMISSION_MODULES.customers,
  [DASHBOARD_SECTIONS.products]: PERMISSION_MODULES.products,
};

export type DashboardCapabilityContext = {
  /** Módulos com can_view efetivo (plano ∩ membership) */
  allowedModules: readonly PermissionModuleId[];
};

export function canViewDashboardSection(
  section: DashboardSection,
  context?: DashboardCapabilityContext
): boolean {
  const allowed = context?.allowedModules ?? [];

  // Bloco "Acesso rápido": visível se houver ao menos um atalho elegível
  // (o componente filtra item a item). Sem módulos = esconde o bloco.
  if (section === DASHBOARD_SECTIONS.shortcuts) {
    return allowed.length > 0;
  }

  const moduleId = DASHBOARD_SECTION_MODULE[section];
  if (!moduleId) return false;
  return allowed.includes(moduleId);
}

export function canCreateInModule(
  moduleId: PermissionModuleId,
  creatableModules: readonly PermissionModuleId[]
): boolean {
  return creatableModules.includes(moduleId);
}
