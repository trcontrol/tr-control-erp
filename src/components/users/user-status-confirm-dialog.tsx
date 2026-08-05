"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  updateCompanyMemberStatus,
  type CompanyUser,
} from "@/lib/users/actions";
import {
  USER_STATUS,
  userStatusLabel,
  type UserStatus,
} from "@/lib/users/format";

type UserStatusConfirmDialogProps = {
  user: CompanyUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function nextStatus(status: UserStatus): UserStatus {
  return status === USER_STATUS.active
    ? USER_STATUS.inactive
    : USER_STATUS.active;
}

export function UserStatusConfirmDialog({
  user,
  open,
  onOpenChange,
}: UserStatusConfirmDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetStatus = user ? nextStatus(user.status) : null;
  const actionLabel =
    targetStatus === USER_STATUS.active ? "Ativar" : "Inativar";

  async function handleConfirm() {
    if (!user || !targetStatus) return;

    setSaving(true);
    setError(null);

    const result = await updateCompanyMemberStatus({
      companyId: user.companyId,
      membershipId: user.membershipId,
      status: targetStatus,
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
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
      title={`${actionLabel} usuário`}
      description="Confirme a alteração de status do membro"
      className="max-w-md"
    >
      {user && targetStatus ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Deseja {actionLabel.toLowerCase()}{" "}
            <span className="font-medium text-[var(--brand-navy)]">
              {user.fullName}
            </span>
            ? O status passará de{" "}
            <span className="font-medium text-foreground">
              {userStatusLabel(user.status)}
            </span>{" "}
            para{" "}
            <span className="font-medium text-foreground">
              {userStatusLabel(targetStatus)}
            </span>
            .
          </p>

          {error ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {error}
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
              disabled={saving}
              onClick={() => void handleConfirm()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Confirmar ${actionLabel.toLowerCase()}`
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
