"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRowActions } from "@/components/users/user-row-actions";
import {
  UserRoleBadge,
  UserStatusBadge,
} from "@/components/users/user-status-badge";
import type { CompanyUser } from "@/lib/users/actions";
import { formatUserDate, userInitials } from "@/lib/users/format";
import { accessProfileLabel } from "@/lib/users/permissions";
import { cn } from "@/lib/utils";

type UsersTableProps = {
  users: CompanyUser[];
  highlightedUserId?: string | null;
  onView: (user: CompanyUser) => void;
  onEdit: (user: CompanyUser) => void;
  onConfigureAccess: (user: CompanyUser) => void;
  onToggleStatus: (user: CompanyUser) => void;
};

export function UsersTable({
  users,
  highlightedUserId = null,
  onView,
  onEdit,
  onConfigureAccess,
  onToggleStatus,
}: UsersTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-[var(--brand-navy)]/10 bg-white shadow-sm md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-[var(--brand-navy)]/[0.045] text-left">
            <tr className="border-b border-[var(--brand-navy)]/10">
              <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                Usuário
              </th>
              <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                E-mail
              </th>
              <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                Cargo
              </th>
              <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                Perfil
              </th>
              <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                Empresa
              </th>
              <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                Status
              </th>
              <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                Criado em
              </th>
              <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-[var(--brand-navy)]">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isHighlighted = user.id === highlightedUserId;

              return (
                <tr
                  key={user.id}
                  className={cn(
                    "border-t border-[var(--brand-navy)]/[0.06]",
                    "transition-colors duration-150",
                    isHighlighted
                      ? "bg-[var(--brand-navy)]/[0.05]"
                      : "hover:bg-[var(--brand-coral)]/[0.04]"
                  )}
                >
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 ring-2 ring-[var(--brand-gold)]/20">
                        {user.avatarUrl ? (
                          <AvatarImage
                            src={user.avatarUrl}
                            alt={user.fullName}
                          />
                        ) : null}
                        <AvatarFallback className="bg-[var(--brand-navy)]/[0.08] text-xs font-semibold text-[var(--brand-navy)]">
                          {userInitials(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium text-[var(--brand-navy)]">
                        {user.fullName}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle text-muted-foreground">
                    {user.email ?? "—"}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <UserRoleBadge role={user.role} />
                  </td>
                  <td className="px-5 py-4 align-middle text-muted-foreground">
                    {accessProfileLabel(user.accessProfile)}
                  </td>
                  <td className="px-5 py-4 align-middle text-muted-foreground">
                    {user.companyName}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <UserStatusBadge status={user.status} />
                  </td>
                  <td className="px-5 py-4 align-middle text-muted-foreground">
                    {formatUserDate(user.createdAt)}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <UserRowActions
                      user={user}
                      onView={onView}
                      onEdit={onEdit}
                      onConfigureAccess={onConfigureAccess}
                      onToggleStatus={onToggleStatus}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
