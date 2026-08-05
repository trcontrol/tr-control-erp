"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { CompanyUser } from "@/lib/users/actions";
import {
  formatUserDate,
  userRoleLabel,
  userStatusLabel,
} from "@/lib/users/format";
import { accessProfileLabel } from "@/lib/users/permissions";
import {
  UserRoleBadge,
  UserStatusBadge,
} from "@/components/users/user-status-badge";

type UserViewDialogProps = {
  user: CompanyUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (user: CompanyUser) => void;
  onConfigureAccess: (user: CompanyUser) => void;
};

export function UserViewDialog({
  user,
  open,
  onOpenChange,
  onEdit,
  onConfigureAccess,
}: UserViewDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Detalhes do usuário"
      description="Visualização dos dados vinculados à empresa ativa"
      className="max-w-lg"
    >
      {user ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Nome</p>
              <p className="text-sm font-medium text-[var(--brand-navy)]">
                {user.fullName}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">E-mail</p>
              <p className="text-sm">{user.email ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Cargo</p>
              <UserRoleBadge role={user.role} />
              <p className="text-xs text-muted-foreground">
                {userRoleLabel(user.role)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <UserStatusBadge status={user.status} />
              <p className="text-xs text-muted-foreground">
                {userStatusLabel(user.status)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Perfil de acesso
              </p>
              <p className="text-sm font-medium text-[var(--brand-navy)]">
                {accessProfileLabel(user.accessProfile)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Empresa
              </p>
              <p className="text-sm">{user.companyName}</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">
                Criado em
              </p>
              <p className="text-sm">{formatUserDate(user.createdAt)}</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onConfigureAccess(user);
              }}
            >
              Configurar acessos
            </Button>
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onEdit(user);
              }}
            >
              Editar
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
