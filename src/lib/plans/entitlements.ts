import { COMPANY_PLANS, type CompanyPlan } from "@/lib/constants";
import {
  PERMISSION_MODULES,
  type PermissionModuleId,
} from "@/lib/users/permissions";

/**
 * Entitlements comerciais por plano (versão 1) — PRESET.
 * Fonte de verdade do plano-base: companies.plan
 * Esta matriz define o preset; o teto efetivo da empresa pode incluir
 * deltas em company_module_overrides (ver company-entitlements.ts).
 * Permissões de usuário ⊆ teto efetivo da empresa.
 *
 * FOLLOW-UP: granularidade de REPORT_TYPES (básico / completo / avançado)
 * por plano — nesta fase `reports` é módulo único nos três planos.
 *
 * Estratégia B — permissões órfãs (aprovada):
 * - Downgrade de plano NÃO apaga member_permissions fora do novo teto.
 * - Runtime (sidebar, gates, Dashboard) ignora módulos não entitled.
 * - Rows órfãs ficam persistidas e inativas; re-upgrade pode reativá-las.
 * - Se o membro for editado/salvo após downgrade, a UI envia só o catálogo
 *   do plano atual e replaceMemberPermissions pode remover órfãs — aceitável.
 *
 * Seats (PLAN_LIMITS) seguem o plano-base, não os módulos efetivos.
 */
export const PLAN_ENTITLEMENTS_VERSION = 1 as const;

/** Ordem comercial para detectar upgrade/downgrade na UI admin. */
export const COMPANY_PLAN_RANK: Record<CompanyPlan, number> = {
  [COMPANY_PLANS.essential]: 1,
  [COMPANY_PLANS.professional]: 2,
  [COMPANY_PLANS.premium]: 3,
};

const ESSENTIAL_MODULES = [
  PERMISSION_MODULES.dashboard,
  PERMISSION_MODULES.customers,
  PERMISSION_MODULES.products,
  PERMISSION_MODULES.sales,
  PERMISSION_MODULES.finance,
  PERMISSION_MODULES.cashFlow,
  PERMISSION_MODULES.tasks,
  PERMISSION_MODULES.reports,
  PERMISSION_MODULES.settings,
] as const satisfies readonly PermissionModuleId[];

const PROFESSIONAL_MODULES = [
  ...ESSENTIAL_MODULES,
  PERMISSION_MODULES.suppliers,
  PERMISSION_MODULES.stock,
  PERMISSION_MODULES.purchases,
  PERMISSION_MODULES.agenda,
  PERMISSION_MODULES.users,
] as const satisfies readonly PermissionModuleId[];

const PREMIUM_MODULES = [
  ...PROFESSIONAL_MODULES,
  PERMISSION_MODULES.funnel,
] as const satisfies readonly PermissionModuleId[];

export const PLAN_MODULE_ENTITLEMENTS: Record<
  CompanyPlan,
  readonly PermissionModuleId[]
> = {
  [COMPANY_PLANS.essential]: ESSENTIAL_MODULES,
  [COMPANY_PLANS.professional]: PROFESSIONAL_MODULES,
  [COMPANY_PLANS.premium]: PREMIUM_MODULES,
};

export function normalizeCompanyPlan(value: unknown): CompanyPlan {
  if (value === COMPANY_PLANS.professional) return COMPANY_PLANS.professional;
  if (value === COMPANY_PLANS.premium) return COMPANY_PLANS.premium;
  if (value === COMPANY_PLANS.essential) return COMPANY_PLANS.essential;
  return COMPANY_PLANS.essential;
}

export function modulesForPlan(plan: CompanyPlan): readonly PermissionModuleId[] {
  return PLAN_MODULE_ENTITLEMENTS[normalizeCompanyPlan(plan)];
}

export function isModuleEntitled(
  plan: CompanyPlan | string | null | undefined,
  module: PermissionModuleId
): boolean {
  const normalized = normalizeCompanyPlan(plan);
  return modulesForPlan(normalized).includes(module);
}

export function entitledModuleSet(
  plan: CompanyPlan | string | null | undefined
): Set<PermissionModuleId> {
  return new Set(modulesForPlan(normalizeCompanyPlan(plan)));
}

export function isPlanUpgrade(
  from: CompanyPlan | string | null | undefined,
  to: CompanyPlan | string | null | undefined
): boolean {
  const a = normalizeCompanyPlan(from);
  const b = normalizeCompanyPlan(to);
  return COMPANY_PLAN_RANK[b] > COMPANY_PLAN_RANK[a];
}

export function isPlanDowngrade(
  from: CompanyPlan | string | null | undefined,
  to: CompanyPlan | string | null | undefined
): boolean {
  const a = normalizeCompanyPlan(from);
  const b = normalizeCompanyPlan(to);
  return COMPANY_PLAN_RANK[b] < COMPANY_PLAN_RANK[a];
}
