"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { UserAccessPermissionsForm } from "@/components/users/user-access-permissions-form";
import type { CompanyUser } from "@/lib/users/actions";
import {
  getCompanyMemberPermissions,
  saveCompanyMemberPermissions,
} from "@/lib/users/member-actions";
import {
  ACCESS_PROFILES,
  type AccessProfileId,
  type ModulePermissionState,
  applyViewDependency,
  protectPrimaryOwnerPermissions,
} from "@/lib/users/permissions";
import { permissionsForProfileInCompany } from "@/lib/plans/access";
import { useTenant } from "@/providers/tenant-provider";

type UserPermissionsDialogProps = {
  user: CompanyUser | null;
  open: boolean;
  initialProfile?: AccessProfileId | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function UserPermissionsDialog({
  user,
  open,
  initialProfile = null,
  onOpenChange,
  onSaved,
}: UserPermissionsDialogProps) {
  const router = useRouter();
  const { company, entitledModules, refreshAccessSnapshot } = useTenant();
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

  const [accessProfile, setAccessProfile] = useState<AccessProfileId>(
    ACCESS_PROFILES.professional
  );
  const [permissions, setPermissions] = useState<ModulePermissionState[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProtectedSelfOwner = Boolean(
    user?.isPrimaryOwner && user?.isCurrentUser
  );

  useEffect(() => {
    if (!open || !user) return;

    let cancelled = false;

    async function load() {
      if (!user) return;
      setLoading(true);
      setError(null);

      const result = await getCompanyMemberPermissions({
        companyId: user.companyId,
        membershipId: user.membershipId,
      });

      if (cancelled) return;

      if (result.error || !result.data) {
        const profile = initialProfile ?? user.accessProfile;
        const next = protectPrimaryOwnerPermissions(
          profilePermissions(profile),
          {
            isPrimaryOwner: user.isPrimaryOwner,
            isSelf: user.isCurrentUser,
          }
        );
        setAccessProfile(profile);
        setPermissions(next);
        setError(result.error?.message ?? "Não foi possível carregar permissões.");
        setLoading(false);
        return;
      }

      const profile = initialProfile ?? result.data.accessProfile;
      const next =
        initialProfile && initialProfile !== result.data.accessProfile
          ? protectPrimaryOwnerPermissions(
              profilePermissions(initialProfile),
              {
                isPrimaryOwner: user.isPrimaryOwner,
                isSelf: user.isCurrentUser,
              }
            )
          : protectPrimaryOwnerPermissions(result.data.permissions, {
              isPrimaryOwner: user.isPrimaryOwner,
              isSelf: user.isCurrentUser,
            });

      setAccessProfile(profile);
      setPermissions(next);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, user, initialProfile, plan, profilePermissions]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);

    const safePermissions = protectPrimaryOwnerPermissions(permissions, {
      isPrimaryOwner: user.isPrimaryOwner,
      isSelf: user.isCurrentUser,
    }).map(applyViewDependency);

    const result = await saveCompanyMemberPermissions({
      companyId: user.companyId,
      membershipId: user.membershipId,
      accessProfile,
      permissions: safePermissions,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    onSaved?.();

    // Snapshot da sessão: só se o próprio usuário foi editado na empresa ativa.
    // Sempre reconsulta auth.uid() via getMemberAccessAction — nunca a matriz do form.
    if (
      user.isCurrentUser &&
      company?.id &&
      user.companyId === company.id
    ) {
      await refreshAccessSnapshot(company.id);
      router.refresh();
    }

    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Configurar acessos"
      description={
        user
          ? `Permissões por módulo para ${user.fullName}`
          : "Permissões por módulo"
      }
      className="max-w-5xl"
    >
      {user ? (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando permissões…
            </div>
          ) : (
            <UserAccessPermissionsForm
              idPrefix="edit-access"
              accessProfile={accessProfile}
              permissions={permissions}
              plan={plan}
              entitledModules={entitledModules}
              onAccessProfileChange={setAccessProfile}
              onPermissionsChange={setPermissions}
              protectPrimaryOwner={isProtectedSelfOwner}
              error={error}
              onError={setError}
            />
          )}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={saving || loading}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || loading}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar acessos"
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
