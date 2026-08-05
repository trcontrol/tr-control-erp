"use client";

import { Building2, CalendarDays, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserRowActions } from "@/components/users/user-row-actions";
import {
  UserRoleBadge,
  UserStatusBadge,
} from "@/components/users/user-status-badge";
import type { CompanyUser } from "@/lib/users/actions";
import { formatUserDate, userInitials } from "@/lib/users/format";
import { accessProfileLabel } from "@/lib/users/permissions";
import { cn } from "@/lib/utils";

type UserCardProps = {
  user: CompanyUser;
  onView: (user: CompanyUser) => void;
  onEdit: (user: CompanyUser) => void;
  onConfigureAccess: (user: CompanyUser) => void;
  onToggleStatus: (user: CompanyUser) => void;
};

export function UserCard({
  user,
  onView,
  onEdit,
  onConfigureAccess,
  onToggleStatus,
}: UserCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border-[var(--brand-navy)]/10 shadow-sm",
        "transition-[transform,box-shadow,border-color] duration-200",
        "hover:-translate-y-0.5 hover:border-[var(--brand-coral)]/25 hover:shadow-md",
        "motion-reduce:hover:translate-y-0"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 ring-2 ring-[var(--brand-gold)]/25">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.fullName} />
            ) : null}
            <AvatarFallback className="bg-[var(--brand-navy)]/[0.08] text-xs font-semibold text-[var(--brand-navy)]">
              {userInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="truncate text-base text-[var(--brand-navy)]">
              {user.fullName}
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 truncate">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.email ?? "—"}</span>
            </CardDescription>
          </div>

          <UserStatusBadge status={user.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Cargo</p>
            <UserRoleBadge role={user.role} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Perfil</p>
            <p className="text-[var(--brand-navy)]">
              {accessProfileLabel(user.accessProfile)}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Criado em</p>
            <p className="inline-flex items-center gap-1.5 text-[var(--brand-navy)]">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {formatUserDate(user.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-t border-[var(--brand-navy)]/8 pt-3 text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{user.companyName}</span>
        </div>

        <div className="flex items-center justify-end border-t border-[var(--brand-navy)]/8 pt-3">
          <UserRowActions
            user={user}
            onView={onView}
            onEdit={onEdit}
            onConfigureAccess={onConfigureAccess}
            onToggleStatus={onToggleStatus}
          />
        </div>
      </CardContent>
    </Card>
  );
}
