"use client";

import { PERMISSION_MODULE_CATALOG } from "@/lib/users/permissions";
import type { PermissionModuleId } from "@/lib/users/permissions";
import { modulesForPlan, normalizeCompanyPlan } from "@/lib/plans/entitlements";
import { isStructuralModule } from "@/lib/plans/company-entitlements";
import type { CompanyPlan } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type CompanyModuleAccessChecklistProps = {
  plan: CompanyPlan | string;
  customized: boolean;
  selectedModules: PermissionModuleId[];
  onCustomizedChange: (customized: boolean) => void;
  onSelectedModulesChange: (modules: PermissionModuleId[]) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export function CompanyModuleAccessChecklist({
  plan,
  customized,
  selectedModules,
  onCustomizedChange,
  onSelectedModulesChange,
  disabled = false,
  idPrefix = "module-access",
}: CompanyModuleAccessChecklistProps) {
  const normalizedPlan = normalizeCompanyPlan(plan);
  const preset = new Set(modulesForPlan(normalizedPlan));
  const selected = new Set(selectedModules);

  function toggleModule(moduleId: PermissionModuleId, checked: boolean) {
    if (
      !checked &&
      preset.has(moduleId) &&
      isStructuralModule(moduleId)
    ) {
      return;
    }
    const next = new Set(selected);
    if (checked) next.add(moduleId);
    else next.delete(moduleId);
    // Garantir estruturais do preset sempre ligados
    for (const mod of preset) {
      if (isStructuralModule(mod)) next.add(mod);
    }
    onSelectedModulesChange([...next]);
  }

  function handleCustomizedToggle(checked: boolean) {
    onCustomizedChange(checked);
    if (checked) {
      onSelectedModulesChange([...modulesForPlan(normalizedPlan)]);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-[var(--brand-navy)]/10 bg-muted/20 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[var(--brand-navy)]">
          Acessos por módulo
        </h3>
        <p className="text-xs text-muted-foreground">
          O plano define o preset. Personalizar grava apenas diferenças
          (extras ou remoções). Módulos estruturais do plano não podem ser
          removidos.
        </p>
      </div>

      <label
        className={cn(
          "flex items-start gap-2 text-sm",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        )}
      >
        <input
          id={`${idPrefix}-customize`}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border"
          checked={customized}
          disabled={disabled}
          onChange={(event) => handleCustomizedToggle(event.target.checked)}
        />
        <span>
          <span className="font-medium text-[var(--brand-navy)]">
            Personalizar acessos desta empresa
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {customized
              ? "Checklist ativo — salva somente deltas em relação ao plano."
              : "Usa exatamente os módulos do plano selecionado."}
          </span>
        </span>
      </label>

      {customized ? (
        <div className="space-y-2 border-t border-[var(--brand-navy)]/10 pt-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Módulos liberados
          </Label>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {PERMISSION_MODULE_CATALOG.map((mod) => {
              const inPreset = preset.has(mod.id);
              const structuralLocked =
                inPreset && isStructuralModule(mod.id);
              const isOn = structuralLocked || selected.has(mod.id);
              const tag = structuralLocked
                ? "obrigatorio"
                : isOn && !inPreset
                  ? "extra"
                  : !isOn && inPreset
                    ? "removido"
                    : inPreset
                      ? "plano"
                      : null;

              return (
                <li key={mod.id}>
                  <label
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background/80",
                      structuralLocked || disabled
                        ? "cursor-not-allowed opacity-80"
                        : "cursor-pointer"
                    )}
                    title={
                      structuralLocked
                        ? "Módulo estrutural do plano — não pode ser removido"
                        : undefined
                    }
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-input"
                      checked={isOn}
                      disabled={disabled || structuralLocked}
                      onChange={(event) =>
                        toggleModule(mod.id, event.target.checked)
                      }
                    />
                    <span className="flex-1 text-[var(--brand-navy)]">
                      {mod.label}
                    </span>
                    {tag === "obrigatorio" ? (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-navy)]">
                        Obrigatório
                      </span>
                    ) : null}
                    {tag === "plano" ? (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        plano
                      </span>
                    ) : null}
                    {tag === "extra" ? (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                        extra
                      </span>
                    ) : null}
                    {tag === "removido" ? (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-amber-800">
                        removido
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
