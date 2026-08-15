import type { PermissionModuleId } from "@/lib/users/permissions";
import { PERMISSION_MODULES } from "@/lib/users/permissions";
import { ROUTES } from "@/lib/constants";

/**
 * Itens de navegação do tenant com chave de módulo explícita.
 * /companies (dados da empresa ativa) NÃO é entitlement comercial nesta fase.
 */
export type TenantNavItem = {
  name: string;
  href: string;
  /** null = fora do catálogo comercial (ex.: /companies — follow-up Minha Empresa) */
  module: PermissionModuleId | null;
};

export const TENANT_NAVIGATION: TenantNavItem[] = [
  { name: "Dashboard", href: ROUTES.dashboard, module: PERMISSION_MODULES.dashboard },
  { name: "Empresas", href: ROUTES.companies, module: null },
  { name: "Clientes", href: ROUTES.customers, module: PERMISSION_MODULES.customers },
  { name: "Fornecedores", href: ROUTES.suppliers, module: PERMISSION_MODULES.suppliers },
  { name: "Produtos", href: ROUTES.products, module: PERMISSION_MODULES.products },
  { name: "Estoque", href: ROUTES.stock, module: PERMISSION_MODULES.stock },
  { name: "Compras", href: ROUTES.purchases, module: PERMISSION_MODULES.purchases },
  { name: "Funil Comercial", href: ROUTES.funnel, module: PERMISSION_MODULES.funnel },
  { name: "Vendas", href: ROUTES.sales, module: PERMISSION_MODULES.sales },
  { name: "Financeiro", href: ROUTES.finance, module: PERMISSION_MODULES.finance },
  {
    name: "Fluxo de Caixa",
    href: ROUTES.cashFlow,
    module: PERMISSION_MODULES.cashFlow,
  },
  { name: "Tarefas", href: ROUTES.tasks, module: PERMISSION_MODULES.tasks },
  { name: "Agenda", href: ROUTES.agenda, module: PERMISSION_MODULES.agenda },
  { name: "Relatórios", href: ROUTES.reports, module: PERMISSION_MODULES.reports },
  { name: "Usuários", href: ROUTES.users, module: PERMISSION_MODULES.users },
  {
    name: "Configurações",
    href: ROUTES.settings,
    module: PERMISSION_MODULES.settings,
  },
];

/** Mapeia pathname → módulo comercial (para guards). /companies → null. */
export function moduleForPathname(
  pathname: string
): PermissionModuleId | null {
  const normalized = pathname.split("?")[0] ?? pathname;

  if (normalized === ROUTES.dashboard || normalized.startsWith(`${ROUTES.dashboard}/`)) {
    return PERMISSION_MODULES.dashboard;
  }
  if (normalized === ROUTES.companies || normalized.startsWith(`${ROUTES.companies}/`)) {
    return null;
  }
  if (normalized.startsWith("/admin")) {
    return null;
  }

  const match = TENANT_NAVIGATION.find((item) => {
    if (!item.module) return false;
    return (
      normalized === item.href || normalized.startsWith(`${item.href}/`)
    );
  });

  return match?.module ?? null;
}
