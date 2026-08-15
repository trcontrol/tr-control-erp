"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ACCESS_PROFILE_OPTIONS,
  ACCESS_PROFILES,
  PERMISSION_ACTIONS,
  PERMISSION_SCOPE_OPTIONS,
  type AccessProfileId,
  type ModulePermissionState,
  type PermissionAction,
  applyFullAccess,
  applyReadOnlyAccess,
  isCriticalOwnerModule,
  protectPrimaryOwnerPermissions,
  setPermissionAction,
} from "@/lib/users/permissions";
import {
  catalogModulesForPlan,
  intersectPermissionsWithPlan,
  permissionsForProfileInPlan,
} from "@/lib/plans/access";
import { cn } from "@/lib/utils";

type UserAccessPermissionsFormProps = {
  accessProfile: AccessProfileId;
  permissions: ModulePermissionState[];
  /** Plano da empresa ativa — limita módulos exibidos/editáveis */
  plan: string;
  onAccessProfileChange: (profile: AccessProfileId) => void;
  onPermissionsChange: (permissions: ModulePermissionState[]) => void;
  protectPrimaryOwner?: boolean;
  showProfileSelect?: boolean;
  error?: string | null;
  onError?: (message: string | null) => void;
  idPrefix?: string;
};

function ActionCheckbox({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
      )}
    >
      <input
        type="checkbox"
        className="h-3.5 w-3.5 rounded border-input accent-[var(--brand-coral)]"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function UserAccessPermissionsForm({
  accessProfile,
  permissions,
  plan,
  onAccessProfileChange,
  onPermissionsChange,
  protectPrimaryOwner = false,
  showProfileSelect = true,
  error = null,
  onError,
  idPrefix = "access",
}: UserAccessPermissionsFormProps) {
  const moduleCatalog = useMemo(() => catalogModulesForPlan(plan), [plan]);

  const moduleById = useMemo(
    () => new Map(moduleCatalog.map((item) => [item.id, item])),
    [moduleCatalog]
  );

  const visiblePermissions = useMemo(
    () =>
      permissions.filter((item) => moduleById.has(item.module)),
    [permissions, moduleById]
  );

  function withOwnerProtection(next: ModulePermissionState[]) {
    return protectPrimaryOwnerPermissions(next, {
      isPrimaryOwner: protectPrimaryOwner,
      isSelf: protectPrimaryOwner,
    });
  }

  function updatePermissions(next: ModulePermissionState[], markCustom = true) {
    onPermissionsChange(withOwnerProtection(next));
    if (markCustom && accessProfile !== ACCESS_PROFILES.custom) {
      onAccessProfileChange(ACCESS_PROFILES.custom);
    }
  }

  function handleProfileChange(profile: AccessProfileId) {
    onAccessProfileChange(profile);
    onPermissionsChange(
      withOwnerProtection(permissionsForProfileInPlan(profile, plan))
    );
    onError?.(null);
  }

  function handleActionChange(
    moduleId: ModulePermissionState["module"],
    action: PermissionAction,
    enabled: boolean
  ) {
    const moduleConfig = moduleById.get(moduleId);
    if (!moduleConfig) return;

    if (
      protectPrimaryOwner &&
      isCriticalOwnerModule(moduleId) &&
      action === PERMISSION_ACTIONS.view &&
      !enabled
    ) {
      onError?.(
        "O administrador principal não pode remover o próprio acesso a Usuários e Configurações."
      );
      return;
    }

    onError?.(null);
    updatePermissions(
      permissions.map((item) => {
        if (item.module !== moduleId) return item;
        return setPermissionAction(
          item,
          action,
          enabled,
          moduleConfig.supportsExport
        );
      })
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        {showProfileSelect ? (
          <div className="w-full space-y-2 lg:max-w-sm">
            <Label htmlFor={`${idPrefix}-profile`}>Perfil de acesso</Label>
            <Select
              id={`${idPrefix}-profile`}
              value={accessProfile}
              onChange={(event) =>
                handleProfileChange(event.target.value as AccessProfileId)
              }
            >
              {ACCESS_PROFILE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Perfil selecionado
            </p>
            <p className="text-sm font-semibold text-[var(--brand-navy)]">
              {
                ACCESS_PROFILE_OPTIONS.find(
                  (item) => item.value === accessProfile
                )?.label
              }
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              updatePermissions(
                intersectPermissionsWithPlan(applyFullAccess(), plan),
                false
              );
              onAccessProfileChange(ACCESS_PROFILES.administrator);
              onError?.(null);
            }}
          >
            Acesso total
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              updatePermissions(
                intersectPermissionsWithPlan(applyReadOnlyAccess(), plan)
              );
              onError?.(null);
            }}
          >
            Somente leitura
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onAccessProfileChange(ACCESS_PROFILES.custom);
              onError?.(null);
            }}
          >
            Personalizado
          </Button>
        </div>
      </div>

      {protectPrimaryOwner ? (
        <div className="rounded-lg border border-[var(--brand-navy)]/10 bg-[var(--brand-navy)]/[0.04] px-3 py-2 text-xs text-[var(--brand-navy)]">
          Como administrador principal, seu acesso a Usuários e Configurações
          permanece protegido.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--brand-navy)]/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-[var(--brand-navy)]/[0.045] text-left">
              <tr className="border-b border-[var(--brand-navy)]/10">
                <th className="px-4 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">
                  Módulo
                </th>
                <th className="px-3 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">
                  Visualizar
                </th>
                <th className="px-3 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">
                  Criar
                </th>
                <th className="px-3 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">
                  Editar
                </th>
                <th className="px-3 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">
                  Excluir
                </th>
                <th className="px-3 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">
                  Exportar
                </th>
                <th className="px-4 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">
                  Escopo
                </th>
              </tr>
            </thead>
            <tbody>
              {visiblePermissions.map((permission) => {
                const moduleConfig = moduleById.get(permission.module);
                if (!moduleConfig) return null;

                const lockView =
                  protectPrimaryOwner &&
                  isCriticalOwnerModule(permission.module);
                const writeDisabled = !permission.view;

                return (
                  <tr
                    key={permission.module}
                    className="border-t border-[var(--brand-navy)]/[0.06] hover:bg-[var(--brand-coral)]/[0.03]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--brand-navy)]">
                      {moduleConfig.label}
                    </td>
                    <td className="px-3 py-3">
                      <ActionCheckbox
                        label="Ver"
                        checked={permission.view}
                        disabled={lockView}
                        onChange={(value) =>
                          handleActionChange(
                            permission.module,
                            PERMISSION_ACTIONS.view,
                            value
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      {moduleConfig.supportsCreateDelete === false ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <ActionCheckbox
                          label="Criar"
                          checked={permission.create}
                          disabled={writeDisabled}
                          onChange={(value) =>
                            handleActionChange(
                              permission.module,
                              PERMISSION_ACTIONS.create,
                              value
                            )
                          }
                        />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <ActionCheckbox
                        label="Editar"
                        checked={permission.edit}
                        disabled={writeDisabled}
                        onChange={(value) =>
                          handleActionChange(
                            permission.module,
                            PERMISSION_ACTIONS.edit,
                            value
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      {moduleConfig.supportsCreateDelete === false ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <ActionCheckbox
                          label="Excluir"
                          checked={permission.delete}
                          disabled={writeDisabled}
                          onChange={(value) =>
                            handleActionChange(
                              permission.module,
                              PERMISSION_ACTIONS.delete,
                              value
                            )
                          }
                        />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {moduleConfig.supportsExport ? (
                        <ActionCheckbox
                          label="Exportar"
                          checked={permission.export}
                          disabled={writeDisabled}
                          onChange={(value) =>
                            handleActionChange(
                              permission.module,
                              PERMISSION_ACTIONS.export,
                              value
                            )
                          }
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={permission.scope}
                        disabled={!permission.view}
                        className="h-8 min-w-[11rem] text-xs"
                        onChange={(event) => {
                          updatePermissions(
                            permissions.map((item) =>
                              item.module === permission.module
                                ? {
                                    ...item,
                                    scope: event.target
                                      .value as ModulePermissionState["scope"],
                                  }
                                : item
                            )
                          );
                        }}
                      >
                        {PERMISSION_SCOPE_OPTIONS.filter((option) =>
                          moduleConfig.scopes.includes(option.value)
                        ).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
    </div>
  );
}
