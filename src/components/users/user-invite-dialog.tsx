"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { UserAccessPermissionsForm } from "@/components/users/user-access-permissions-form";
import { COMPANY_ROLES, type CompanyRole } from "@/lib/constants";
import { inviteCompanyUser } from "@/lib/users/invite-actions";
import { userRoleLabel } from "@/lib/users/format";
import {
  ACCESS_PROFILE_OPTIONS,
  ACCESS_PROFILES,
  PERMISSION_SCOPE_OPTIONS,
  type AccessProfileId,
  type ModulePermissionState,
  accessProfileLabel,
  dominantPermissionScope,
  summarizeEnabledModules,
} from "@/lib/users/permissions";
import { permissionsForProfileInCompany } from "@/lib/plans/access";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";

type InviteStep = 1 | 2 | 3;

type UserInviteDialogProps = {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
};

const STEPS: Array<{ id: InviteStep; label: string }> = [
  { id: 1, label: "Dados" },
  { id: 2, label: "Acessos" },
  { id: 3, label: "Revisão" },
];

function InviteStepIndicator({ current }: { current: InviteStep }) {
  return (
    <ol className="mb-2 grid grid-cols-3 gap-2">
      {STEPS.map((step) => {
        const active = step.id === current;
        const done = step.id < current;

        return (
          <li
            key={step.id}
            className={cn(
              "rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-colors",
              active &&
                "border-[var(--brand-coral)]/40 bg-[var(--brand-coral)]/10 text-[var(--brand-navy)]",
              done &&
                !active &&
                "border-[var(--brand-gold)]/35 bg-[var(--brand-gold)]/10 text-[var(--brand-navy)]",
              !active &&
                !done &&
                "border-[var(--brand-navy)]/10 bg-muted/30 text-muted-foreground"
            )}
          >
            <span className="block text-[10px] uppercase tracking-wide opacity-70">
              Etapa {step.id}
            </span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

export function UserInviteDialog({
  companyId,
  open,
  onOpenChange,
  onInvited,
}: UserInviteDialogProps) {
  const { company, entitledModules } = useTenant();
  const plan = company?.plan ?? "essential";

  const profilePermissions = useCallback(
    (profile: AccessProfileId) => {
      const base = permissionsForProfileInCompany(profile, plan);
      if (entitledModules === undefined) return base;
      const allowed = new Set(entitledModules);
      return base.filter((row) => allowed.has(row.module));
    },
    [plan, entitledModules]
  );

  const [step, setStep] = useState<InviteStep>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>(COMPANY_ROLES.member);
  const [accessProfile, setAccessProfile] = useState<AccessProfileId>(
    ACCESS_PROFILES.professional
  );
  const [permissions, setPermissions] = useState<ModulePermissionState[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFullName("");
    setEmail("");
    setRole(COMPANY_ROLES.member);
    setAccessProfile(ACCESS_PROFILES.professional);
    setPermissions(profilePermissions(ACCESS_PROFILES.professional));
    setSaving(false);
    setError(null);
    setAccessError(null);
    setSuccessMessage(null);
  }, [open, profilePermissions]);

  const enabledModules = useMemo(
    () => summarizeEnabledModules(permissions),
    [permissions]
  );

  const dominantScope = useMemo(
    () => dominantPermissionScope(permissions),
    [permissions]
  );

  const scopeLabel =
    PERMISSION_SCOPE_OPTIONS.find((item) => item.value === dominantScope)
      ?.label ?? dominantScope;

  function validateStep1() {
    if (!fullName.trim()) {
      setError("Informe o nome do usuário.");
      return false;
    }
    if (!email.trim()) {
      setError("Informe o e-mail do usuário.");
      return false;
    }
    setError(null);
    return true;
  }

  function goToAccesses() {
    if (!validateStep1()) return;

    if (accessProfile !== ACCESS_PROFILES.custom) {
      setPermissions(profilePermissions(accessProfile));
    }
    setStep(2);
  }

  function handleProfileChangeFromStep1(profile: AccessProfileId) {
    setAccessProfile(profile);
    if (profile !== ACCESS_PROFILES.custom) {
      setPermissions(profilePermissions(profile));
    }
  }

  async function handleSendInvite() {
    setSaving(true);
    setError(null);

    const result = await inviteCompanyUser({
      companyId,
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      accessProfile,
      permissions,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSuccessMessage(
      result.data.message || "Convite enviado com sucesso."
    );
    onInvited?.();
    window.setTimeout(() => {
      onOpenChange(false);
    }, 1800);
  }

  const dialogTitle =
    step === 1
      ? "Novo usuário"
      : step === 2
        ? "Configurar acessos"
        : "Revisar convite";

  const dialogDescription =
    step === 1
      ? "Preencha os dados do membro e avance para configurar os acessos."
      : step === 2
        ? "Defina perfil, escopo e permissões por módulo antes do convite."
        : "Confira os dados e o pacote de permissões antes de enviar.";

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      className={step === 1 ? "max-w-lg" : "max-w-5xl"}
    >
      <div className="space-y-4">
        <InviteStepIndicator current={step} />

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nome</Label>
              <Input
                id="invite-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ex.: Ana Souza"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Ex.: ana@empresa.com"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-role">Cargo</Label>
                <Select
                  id="invite-role"
                  value={role}
                  onChange={(event) => {
                    const nextRole = event.target.value as CompanyRole;
                    setRole(nextRole);
                    if (nextRole === COMPANY_ROLES.admin) {
                      handleProfileChangeFromStep1(
                        ACCESS_PROFILES.administrator
                      );
                    }
                  }}
                >
                  <option value={COMPANY_ROLES.admin}>Administrador</option>
                  <option value={COMPANY_ROLES.member}>Membro</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-profile">Perfil de acesso</Label>
                <Select
                  id="invite-profile"
                  value={accessProfile}
                  onChange={(event) =>
                    handleProfileChangeFromStep1(
                      event.target.value as AccessProfileId
                    )
                  }
                >
                  {ACCESS_PROFILE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={goToAccesses}>
                Configurar acessos
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <UserAccessPermissionsForm
              idPrefix="invite-access"
              accessProfile={accessProfile}
              permissions={permissions}
              plan={plan}
              entitledModules={entitledModules}
              onAccessProfileChange={setAccessProfile}
              onPermissionsChange={setPermissions}
              showProfileSelect
              error={accessError}
              onError={setAccessError}
            />

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={() => setStep(3)}>
                  Revisar convite
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="grid gap-4 rounded-2xl border border-[var(--brand-navy)]/10 bg-[var(--brand-navy)]/[0.02] p-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Nome</p>
                <p className="text-sm font-semibold text-[var(--brand-navy)]">
                  {fullName.trim()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  E-mail
                </p>
                <p className="text-sm">{email.trim()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Cargo</p>
                <p className="text-sm">{userRoleLabel(role)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Perfil
                </p>
                <p className="text-sm">{accessProfileLabel(accessProfile)}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Escopo predominante
                </p>
                <p className="text-sm">{scopeLabel}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--brand-navy)]">
                Módulos liberados ({enabledModules.length})
              </p>
              {enabledModules.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum módulo com Visualizar habilitado.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--brand-navy)]/10">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[var(--brand-navy)]/[0.045] text-left">
                        <tr className="border-b border-[var(--brand-navy)]/10">
                          <th className="px-4 py-2.5 text-[12px] font-semibold text-[var(--brand-navy)]">
                            Módulo
                          </th>
                          <th className="px-4 py-2.5 text-[12px] font-semibold text-[var(--brand-navy)]">
                            Permissões
                          </th>
                          <th className="px-4 py-2.5 text-[12px] font-semibold text-[var(--brand-navy)]">
                            Escopo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {enabledModules.map((item) => (
                          <tr
                            key={item.module}
                            className="border-t border-[var(--brand-navy)]/[0.06]"
                          >
                            <td className="px-4 py-2.5 font-medium text-[var(--brand-navy)]">
                              {item.label}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {item.actions.join(" · ")}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {
                                PERMISSION_SCOPE_OPTIONS.find(
                                  (option) => option.value === item.scope
                                )?.label
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {successMessage ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                {successMessage}
              </div>
            ) : error ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {error}
              </div>
            ) : (
              <div className="rounded-md border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 p-3 text-sm text-[var(--brand-navy)]">
                Ao enviar, o convite será gravado e o convidado receberá um
                e-mail para criar a senha e acessar a empresa.
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setStep(2)}
              >
                Voltar
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSendInvite()}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Enviar convite"
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
