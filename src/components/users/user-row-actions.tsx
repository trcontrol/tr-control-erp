"use client";

import type { ReactNode } from "react";
import {
  Eye,
  Pencil,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CompanyUser } from "@/lib/users/actions";
import { USER_STATUS } from "@/lib/users/format";
import { cn } from "@/lib/utils";

type ActionTone = "view" | "edit" | "access" | "activate" | "deactivate";

type UserRowActionsProps = {
  user: CompanyUser;
  onView: (user: CompanyUser) => void;
  onEdit: (user: CompanyUser) => void;
  onConfigureAccess: (user: CompanyUser) => void;
  onToggleStatus: (user: CompanyUser) => void;
};

const ACTION_HOVER: Record<ActionTone, string> = {
  view: "hover:bg-[var(--brand-navy)]/10 hover:text-[var(--brand-navy)]",
  edit: "hover:bg-[var(--brand-coral)]/12 hover:text-[var(--brand-coral)]",
  access: "hover:bg-[var(--brand-gold)]/15 hover:text-[var(--brand-navy)]",
  activate: "hover:bg-emerald-100/80 hover:text-emerald-700",
  deactivate: "hover:bg-amber-100/80 hover:text-amber-800",
};

function ActionIconButton({
  label,
  tone,
  onClick,
  children,
}: {
  label: string;
  tone: ActionTone;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className={cn(
        "group/action relative text-muted-foreground transition-colors",
        ACTION_HOVER[tone]
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function UserRowActions({
  user,
  onView,
  onEdit,
  onConfigureAccess,
  onToggleStatus,
}: UserRowActionsProps) {
  const canActivate = user.status !== USER_STATUS.active;
  const toggleLabel = canActivate ? "Ativar" : "Inativar";

  return (
    <div className="flex justify-end gap-0.5">
      <ActionIconButton
        label="Visualizar"
        tone="view"
        onClick={() => onView(user)}
      >
        <Eye className="h-4 w-4" />
      </ActionIconButton>
      <ActionIconButton
        label="Editar"
        tone="edit"
        onClick={() => onEdit(user)}
      >
        <Pencil className="h-4 w-4" />
      </ActionIconButton>
      <ActionIconButton
        label="Configurar acessos"
        tone="access"
        onClick={() => onConfigureAccess(user)}
      >
        <Shield className="h-4 w-4" />
      </ActionIconButton>
      <ActionIconButton
        label={toggleLabel}
        tone={canActivate ? "activate" : "deactivate"}
        onClick={() => onToggleStatus(user)}
      >
        {canActivate ? (
          <UserCheck className="h-4 w-4" />
        ) : (
          <UserX className="h-4 w-4" />
        )}
      </ActionIconButton>
    </div>
  );
}
