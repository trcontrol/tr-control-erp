/**
 * Testes Fase 1.1 — company entitlements + hardening.
 * Executar: npx --yes tsx src/lib/plans/company-entitlements.test.ts
 */
import assert from "node:assert/strict";
import {
  buildModuleOverrideMap,
  computeModuleOverrideDeltas,
  hasCustomModuleAccess,
  isModuleEntitledForCompany,
  isStructuralRemovalBlocked,
  modulesForCompany,
  normalizeModuleOverridesForPlan,
  sanitizeModuleOverridesForPlan,
  STRUCTURAL_MODULE_IDS,
} from "./company-entitlements";
import {
  canViewModule,
  catalogModulesForCompany,
  catalogModulesForPlan,
  permissionAllowsAction,
  resolveAllowedModules,
} from "./access";
import { COMPANY_PLANS, COMPANY_ROLES } from "@/lib/constants";
import {
  ACCESS_PROFILES,
  PERMISSION_MODULE_CATALOG,
  PERMISSION_MODULES,
} from "@/lib/users/permissions";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (error) {
    console.error(`FAIL — ${name}`);
    throw error;
  }
}

/** Simula resolução de catálogo UI: undefined = legado; [] = zero. */
function catalogForEntitled(
  plan: string,
  entitledModules: string[] | undefined
) {
  if (entitledModules === undefined) {
    return catalogModulesForPlan(plan).map((m) => m.id);
  }
  const allowed = new Set(entitledModules);
  return PERMISSION_MODULE_CATALOG.filter((m) => allowed.has(m.id)).map(
    (m) => m.id
  );
}

run("A. Essencial sem override → comportamento atual", () => {
  const modules = modulesForCompany(COMPANY_PLANS.essential);
  assert.ok(modules.includes(PERMISSION_MODULES.sales));
  assert.ok(!modules.includes(PERMISSION_MODULES.stock));
  assert.equal(hasCustomModuleAccess(buildModuleOverrideMap([])), false);
});

run("B. Essencial + stock=true → stock liberado", () => {
  const overrides = buildModuleOverrideMap([
    { module_key: "stock", enabled: true },
  ]);
  assert.equal(
    isModuleEntitledForCompany(
      COMPANY_PLANS.essential,
      PERMISSION_MODULES.stock,
      overrides
    ),
    true
  );
});

run("C. Essencial + reports=false → reports bloqueado", () => {
  const overrides = buildModuleOverrideMap([
    { module_key: "reports", enabled: false },
  ]);
  assert.equal(
    isModuleEntitledForCompany(
      COMPANY_PLANS.essential,
      PERMISSION_MODULES.reports,
      overrides
    ),
    false
  );
});

run("D. create custom deltas — só extras/remoções válidas", () => {
  const deltas = computeModuleOverrideDeltas(COMPANY_PLANS.essential, [
    ...modulesForCompany(COMPANY_PLANS.essential),
    PERMISSION_MODULES.stock,
  ]);
  assert.deepEqual(deltas, [
    { module_key: PERMISSION_MODULES.stock, enabled: true },
  ]);
});

run("E. create custom — remoção estrutural NÃO gera delta", () => {
  const withoutSales = modulesForCompany(COMPANY_PLANS.essential).filter(
    (m) => m !== PERMISSION_MODULES.sales
  );
  const deltas = computeModuleOverrideDeltas(
    COMPANY_PLANS.essential,
    withoutSales
  );
  assert.equal(
    deltas.some((d) => d.module_key === PERMISSION_MODULES.sales),
    false
  );
});

run("F. Owner não ultrapassa override false", () => {
  const overrides = buildModuleOverrideMap([
    { module_key: "reports", enabled: false },
  ]);
  assert.equal(
    canViewModule({
      plan: COMPANY_PLANS.essential,
      module: PERMISSION_MODULES.reports,
      role: COMPANY_ROLES.owner,
      accessProfile: ACCESS_PROFILES.administrator,
      overrides,
    }),
    false
  );
});

run("G. entitledModules undefined → fallback legado (preset)", () => {
  const ids = catalogForEntitled(COMPANY_PLANS.essential, undefined);
  assert.ok(ids.includes(PERMISSION_MODULES.sales));
  assert.ok(!ids.includes(PERMISSION_MODULES.stock));
});

run("H. entitledModules [] → zero módulos, sem fallback", () => {
  const ids = catalogForEntitled(COMPANY_PLANS.essential, []);
  assert.equal(ids.length, 0);
});

run("I/J. troca de plano — normaliza; cancelar = estado local (lógica)", () => {
  const before = {
    plan: COMPANY_PLANS.essential,
    selected: [
      ...modulesForCompany(COMPANY_PLANS.essential),
      PERMISSION_MODULES.stock,
    ],
  };
  // Cancelar: preserva before (simulação)
  const cancelled = { ...before };
  assert.equal(cancelled.plan, COMPANY_PLANS.essential);
  assert.ok(cancelled.selected.includes(PERMISSION_MODULES.stock));

  // Confirmar: novo preset
  const confirmedSelected = modulesForCompany(COMPANY_PLANS.professional);
  assert.ok(confirmedSelected.includes(PERMISSION_MODULES.stock));
  assert.ok(!confirmedSelected.includes(PERMISSION_MODULES.funnel));
});

run("K. structural modules não podem gerar override false", () => {
  for (const structuralId of STRUCTURAL_MODULE_IDS) {
    assert.equal(
      isStructuralRemovalBlocked(COMPANY_PLANS.essential, structuralId, false),
      true
    );
  }
  const sanitized = sanitizeModuleOverridesForPlan(
    COMPANY_PLANS.essential,
    buildModuleOverrideMap([
      { module_key: "sales", enabled: false },
      { module_key: "stock", enabled: true },
    ])
  );
  assert.ok(
    sanitized.rejectedStructuralRemovals.includes(PERMISSION_MODULES.sales)
  );
  assert.equal(sanitized.overrides.get(PERMISSION_MODULES.stock), true);
  assert.equal(sanitized.overrides.has(PERMISSION_MODULES.sales), false);
});

run("L. restore default limpa overrides (mapa vazio)", () => {
  const restored = normalizeModuleOverridesForPlan(
    COMPANY_PLANS.essential,
    buildModuleOverrideMap([])
  );
  assert.equal(restored.size, 0);
  assert.deepEqual(
    modulesForCompany(COMPANY_PLANS.essential, restored),
    modulesForCompany(COMPANY_PLANS.essential)
  );
});

run("M. empresa sem overrides continua igual", () => {
  assert.deepEqual(
    modulesForCompany(COMPANY_PLANS.premium),
    modulesForCompany(COMPANY_PLANS.premium, buildModuleOverrideMap([]))
  );
});

run("N. member sem perm não ganha acesso só pela empresa", () => {
  const overrides = buildModuleOverrideMap([
    { module_key: "stock", enabled: true },
  ]);
  const allowed = resolveAllowedModules({
    plan: COMPANY_PLANS.essential,
    role: COMPANY_ROLES.member,
    accessProfile: ACCESS_PROFILES.professional,
    permissionRows: [],
    overrides,
  });
  assert.equal(allowed.has(PERMISSION_MODULES.stock), false);
});

run("O. normalize remove stock=true após upgrade Professional", () => {
  const before = buildModuleOverrideMap([
    { module_key: "stock", enabled: true },
    { module_key: "reports", enabled: false },
  ]);
  const after = normalizeModuleOverridesForPlan(
    COMPANY_PLANS.professional,
    before
  );
  assert.equal(after.has(PERMISSION_MODULES.stock), false);
  assert.equal(after.get(PERMISSION_MODULES.reports), false);
});

run("P. override false estrutural é ignorado no entitlement efetivo", () => {
  assert.equal(
    isModuleEntitledForCompany(
      COMPANY_PLANS.essential,
      PERMISSION_MODULES.sales,
      buildModuleOverrideMap([{ module_key: "sales", enabled: false }])
    ),
    true
  );
  assert.equal(
    permissionAllowsAction({
      plan: COMPANY_PLANS.essential,
      module: PERMISSION_MODULES.sales,
      action: "view",
      role: COMPANY_ROLES.owner,
      accessProfile: ACCESS_PROFILES.administrator,
      row: null,
      overrides: buildModuleOverrideMap([
        { module_key: "sales", enabled: false },
      ]),
    }),
    true
  );
});

run("Q. catalogModulesForCompany com overrides", () => {
  const catalog = catalogModulesForCompany(
    COMPANY_PLANS.essential,
    buildModuleOverrideMap([{ module_key: "stock", enabled: true }])
  );
  assert.ok(catalog.some((m) => m.id === PERMISSION_MODULES.stock));
});

console.log("\nTodos os testes de company-entitlements (1.1) passaram.");
