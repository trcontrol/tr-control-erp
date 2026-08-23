import { type CompanyPlan } from "@/lib/constants";
import {
  isModuleEntitled,
  modulesForPlan,
  normalizeCompanyPlan,
} from "@/lib/plans/entitlements";
import {
  PERMISSION_MODULE_CATALOG,
  PERMISSION_MODULES,
  isPermissionModuleId,
  type PermissionModuleId,
} from "@/lib/users/permissions";

/**
 * Overrides esparsos por empresa (company_module_overrides).
 * Map ausente ou vazio = comportamento idêntico ao preset do plano.
 *
 * Seats (PLAN_LIMITS) continuam no plano-base — conceder `users` como extra
 * a um Essencial NÃO aumenta automaticamente o limite de vagas.
 */

export type CompanyModuleOverrideRow = {
  module_key: string;
  enabled: boolean;
};

/** module → enabled (somente deltas explícitos). */
export type CompanyModuleOverrides = ReadonlyMap<PermissionModuleId, boolean>;

export const EMPTY_MODULE_OVERRIDES: CompanyModuleOverrides = new Map();

/**
 * Módulos estruturais: não podem ser REMOVIDOS via override false
 * quando fazem parte do preset do plano. Não concedem entitlement novo.
 */
export const STRUCTURAL_MODULE_IDS = [
  PERMISSION_MODULES.dashboard,
  PERMISSION_MODULES.settings,
  PERMISSION_MODULES.sales,
  PERMISSION_MODULES.finance,
  PERMISSION_MODULES.cashFlow,
] as const satisfies readonly PermissionModuleId[];

export type StructuralModuleId = (typeof STRUCTURAL_MODULE_IDS)[number];

const STRUCTURAL_SET = new Set<string>(STRUCTURAL_MODULE_IDS);

export function isStructuralModule(module: string): module is StructuralModuleId {
  return STRUCTURAL_SET.has(module);
}

/**
 * Impede remoção (enabled=false) de módulo estrutural presente no preset.
 * Não adiciona módulos estruturais fora do plano.
 */
export function sanitizeModuleOverridesForPlan(
  plan: CompanyPlan | string | null | undefined,
  overrides: CompanyModuleOverrides
): {
  overrides: CompanyModuleOverrides;
  rejectedStructuralRemovals: PermissionModuleId[];
} {
  const normalized = normalizeCompanyPlan(plan);
  const next = new Map<PermissionModuleId, boolean>();
  const rejected: PermissionModuleId[] = [];

  for (const [module, enabled] of overrides) {
    if (!isCommercialModuleKey(module)) continue;
    if (
      enabled === false &&
      isStructuralModule(module) &&
      isModuleEntitled(normalized, module)
    ) {
      rejected.push(module);
      continue;
    }
    next.set(module, enabled);
  }

  return {
    overrides: normalizeModuleOverridesForPlan(normalized, next),
    rejectedStructuralRemovals: rejected,
  };
}

export function isStructuralRemovalBlocked(
  plan: CompanyPlan | string | null | undefined,
  module: PermissionModuleId,
  enabled: boolean
): boolean {
  if (enabled !== false) return false;
  if (!isStructuralModule(module)) return false;
  return isModuleEntitled(plan, module);
}

const COMMERCIAL_MODULE_KEYS = new Set<string>(
  Object.values(PERMISSION_MODULES)
);

export function isCommercialModuleKey(
  value: string
): value is PermissionModuleId {
  return COMMERCIAL_MODULE_KEYS.has(value) && isPermissionModuleId(value);
}

export function buildModuleOverrideMap(
  rows: readonly CompanyModuleOverrideRow[] | null | undefined
): CompanyModuleOverrides {
  const map = new Map<PermissionModuleId, boolean>();
  for (const row of rows ?? []) {
    if (!isCommercialModuleKey(row.module_key)) continue;
    map.set(row.module_key, Boolean(row.enabled));
  }
  return map;
}

/**
 * Precedência: override explícito → preset do plano → sem acesso.
 * Override false em módulo estrutural do preset é ignorado (defesa em profundidade).
 */
export function isModuleEntitledForCompany(
  plan: CompanyPlan | string | null | undefined,
  module: PermissionModuleId,
  overrides: CompanyModuleOverrides = EMPTY_MODULE_OVERRIDES
): boolean {
  const override = overrides.get(module);
  if (override !== undefined) {
    if (isStructuralRemovalBlocked(plan, module, override)) {
      return isModuleEntitled(plan, module);
    }
    return override;
  }
  return isModuleEntitled(plan, module);
}

export function modulesForCompany(
  plan: CompanyPlan | string | null | undefined,
  overrides: CompanyModuleOverrides = EMPTY_MODULE_OVERRIDES
): PermissionModuleId[] {
  const normalized = normalizeCompanyPlan(plan);
  const result: PermissionModuleId[] = [];

  for (const config of PERMISSION_MODULE_CATALOG) {
    if (isModuleEntitledForCompany(normalized, config.id, overrides)) {
      result.push(config.id);
    }
  }

  return result;
}

export function entitledModuleSetForCompany(
  plan: CompanyPlan | string | null | undefined,
  overrides: CompanyModuleOverrides = EMPTY_MODULE_OVERRIDES
): Set<PermissionModuleId> {
  return new Set(modulesForCompany(plan, overrides));
}

/**
 * Diffs esparsos: selected vs preset do plano.
 * Módulo igual ao preset → sem row.
 */
export function computeModuleOverrideDeltas(
  plan: CompanyPlan | string | null | undefined,
  selectedModules: readonly PermissionModuleId[]
): Array<{ module_key: PermissionModuleId; enabled: boolean }> {
  const normalized = normalizeCompanyPlan(plan);
  const preset = new Set(modulesForPlan(normalized));
  const selected = new Set(
    selectedModules.filter((module) => isCommercialModuleKey(module))
  );
  // Estruturais do preset sempre ficam selecionados (não gerar enabled=false).
  for (const structuralId of STRUCTURAL_MODULE_IDS) {
    if (preset.has(structuralId)) selected.add(structuralId);
  }
  const deltas: Array<{ module_key: PermissionModuleId; enabled: boolean }> =
    [];

  for (const config of PERMISSION_MODULE_CATALOG) {
    const inPreset = preset.has(config.id);
    const inSelected = selected.has(config.id);
    if (inSelected === inPreset) continue;
    if (
      !inSelected &&
      inPreset &&
      isStructuralModule(config.id)
    ) {
      // Nunca gravar remoção estrutural.
      continue;
    }
    deltas.push({
      module_key: config.id,
      enabled: inSelected,
    });
  }

  return deltas;
}

/**
 * Remove overrides redundantes após troca de plano (só mantém deltas reais).
 */
export function normalizeModuleOverridesForPlan(
  plan: CompanyPlan | string | null | undefined,
  overrides: CompanyModuleOverrides
): CompanyModuleOverrides {
  const normalized = normalizeCompanyPlan(plan);
  const next = new Map<PermissionModuleId, boolean>();

  for (const [module, enabled] of overrides) {
    if (!isCommercialModuleKey(module)) continue;
    if (isStructuralRemovalBlocked(normalized, module, enabled)) {
      continue;
    }
    const inPreset = isModuleEntitled(normalized, module);
    // enabled=true e já no plano → redundante
    // enabled=false e não no plano → redundante
    if (enabled === inPreset) continue;
    next.set(module, enabled);
  }

  return next;
}

export function overridesMapToRows(
  overrides: CompanyModuleOverrides
): Array<{ module_key: PermissionModuleId; enabled: boolean }> {
  return [...overrides.entries()].map(([module_key, enabled]) => ({
    module_key,
    enabled,
  }));
}

export function hasCustomModuleAccess(
  overrides: CompanyModuleOverrides
): boolean {
  return overrides.size > 0;
}
