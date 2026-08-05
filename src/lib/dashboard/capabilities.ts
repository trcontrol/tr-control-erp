/**
 * Stub de permissões por seção do Dashboard Executivo.
 * Na v1 nenhuma seção é ocultada — a estrutura fica pronta para
 * filtrar por papel/capability no futuro.
 */
export const DASHBOARD_SECTIONS = {
  finance: "finance",
  sales: "sales",
  purchases: "purchases",
  stock: "stock",
  shortcuts: "shortcuts",
  tasks: "tasks",
  funnel: "funnel",
  agenda: "agenda",
} as const;

export type DashboardSection =
  (typeof DASHBOARD_SECTIONS)[keyof typeof DASHBOARD_SECTIONS];

export type DashboardCapabilityContext = {
  role?: string | null;
};

export function canViewDashboardSection(
  section: DashboardSection,
  context?: DashboardCapabilityContext
): boolean {
  // v1: todas as seções visíveis. Futuro: filtrar por role/capability.
  void section;
  void context;
  return true;
}
