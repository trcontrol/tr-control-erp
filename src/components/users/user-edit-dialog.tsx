"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { COMPANY_ROLES, type CompanyRole } from "@/lib/constants";
import {
  companyRoleForAccessProfile,
  updateCompanyMemberBasics,
  type CompanyUser,
} from "@/lib/users/actions";
import { USER_STATUS_OPTIONS, type UserStatus } from "@/lib/users/format";
import {
  ACCESS_PROFILE_OPTIONS,
  ACCESS_PROFILES,
  type AccessProfileId,
} from "@/lib/users/permissions";

type UserEditDialogProps = {
  user: CompanyUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onConfigureAccess: (user: CompanyUser, profile: AccessProfileId) => void;
};

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onSaved,
  onConfigureAccess,
}: UserEditDialogProps) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<CompanyRole>(COMPANY_ROLES.member);
  const [status, setStatus] = useState<UserStatus>("active");
  const [accessProfile, setAccessProfile] = useState<AccessProfileId>(
    ACCESS_PROFILES.professional
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setFullName(user.fullName);
    setRole(user.role);
    setStatus(user.status);
    setAccessProfile(user.accessProfile);
    setError(null);
    setInfo(null);
  }, [open, user]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    const nextRole = user.role === COMPANY_ROLES.owner
      ? COMPANY_ROLES.owner
      : companyRoleForAccessProfile(accessProfile, role);

    const result = await updateCompanyMemberBasics({
      companyId: user.companyId,
      membershipId: user.membershipId,
      userId: user.userId,
      fullName,
      role: nextRole,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    const notes: string[] = [];
    if (!user.isCurrentUser) {
      notes.push(
        "O nome de outros usuários só poderá ser alterado após a migration/admin path (RLS atual limita ao próprio perfil)."
      );
    }
    if (status !== user.status || accessProfile !== user.accessProfile) {
      notes.push(
        "Status e perfil de acesso detalhado serão persistidos após a migration autorizada."
      );
    }
    if (result.data.updatedRole || result.data.updatedName) {
      onSaved();
    }
    if (notes.length > 0) {
      setInfo(notes.join(" "));
      return;
    }

    onOpenChange(false);
  }

  const roleLocked = user?.role === COMPANY_ROLES.owner;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar usuário"
      description="Atualize cargo e dados básicos do membro da empresa"
      className="max-w-lg"
    >
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-user-name">Nome</Label>
            <Input
              id="edit-user-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
            />
            {!user.isCurrentUser ? (
              <p className="text-xs text-muted-foreground">
                A alteração de nome de terceiros depende de evolução do schema/RLS.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-user-email">E-mail</Label>
            <Input
              id="edit-user-email"
              value={user.email ?? "—"}
              readOnly
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              E-mail vinculado ao Auth — somente leitura.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-user-role">Cargo</Label>
              <Select
                id="edit-user-role"
                value={role}
                disabled={roleLocked}
                onChange={(event) => {
                  const next = event.target.value as CompanyRole;
                  setRole(next);
                  if (next === COMPANY_ROLES.admin || next === COMPANY_ROLES.owner) {
                    setAccessProfile(ACCESS_PROFILES.administrator);
                  }
                }}
              >
                <option value={COMPANY_ROLES.owner}>Proprietário</option>
                <option value={COMPANY_ROLES.admin}>Administrador</option>
                <option value={COMPANY_ROLES.member}>Membro</option>
              </Select>
              {roleLocked ? (
                <p className="text-xs text-muted-foreground">
                  O administrador principal mantém o cargo de proprietário.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-status">Status</Label>
              <Select
                id="edit-user-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as UserStatus)
                }
              >
                {USER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-user-profile">Perfil de acesso</Label>
            <Select
              id="edit-user-profile"
              value={accessProfile}
              onChange={(event) =>
                setAccessProfile(event.target.value as AccessProfileId)
              }
            >
              {ACCESS_PROFILE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              {
                ACCESS_PROFILE_OPTIONS.find(
                  (item) => item.value === accessProfile
                )?.description
              }
            </p>
          </div>

          {error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {info ? (
            <div className="rounded-md border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 p-3 text-sm text-[var(--brand-navy)]">
              {info}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onConfigureAccess(user, accessProfile)}
            >
              Configurar acessos
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      ) : null}
    </Dialog>
  );
}
