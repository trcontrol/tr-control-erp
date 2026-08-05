"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { UserAccessPermissionsForm } from "@/components/users/user-access-permissions-form";
import {
  saveCompanyMemberPermissions,
  type CompanyUser,
} from "@/lib/users/actions";
import {
  ACCESS_PROFILES,
  type AccessProfileId,
  type ModulePermissionState,
  applyViewDependency,
  permissionsForProfile,
  protectPrimaryOwnerPermissions,
} from "@/lib/users/permissions";

type UserPermissionsDialogProps = {
  user: CompanyUser | null;
  open: boolean;
  initialProfile?: AccessProfileId | null;
  onOpenChange: (open: boolean) => void;
};

export function UserPermissionsDialog({
  user,
  open,
  initialProfile = null,
  onOpenChange,
}: UserPermissionsDialogProps) {
  const [accessProfile, setAccessProfile] = useState<AccessProfileId>(
    ACCESS_PROFILES.professional
  );
  const [permissions, setPermissions] = useState<ModulePermissionState[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProtectedSelfOwner = Boolean(
    user?.isPrimaryOwner && user?.isCurrentUser
  );

  useEffect(() => {
    if (!open || !user) return;

    const profile = initialProfile ?? user.accessProfile;
    const next = protectPrimaryOwnerPermissions(
      permissionsForProfile(profile),
      {
        isPrimaryOwner: user.isPrimaryOwner,
        isSelf: user.isCurrentUser,
      }
    );

    setAccessProfile(profile);
    setPermissions(next);
    setError(null);
  }, [open, user, initialProfile]);

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
          <UserAccessPermissionsForm
            idPrefix="edit-access"
            accessProfile={accessProfile}
            permissions={permissions}
            onAccessProfileChange={setAccessProfile}
            onPermissionsChange={setPermissions}
            protectPrimaryOwner={isProtectedSelfOwner}
            error={error}
            onError={setError}
          />

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
              disabled={saving}
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
