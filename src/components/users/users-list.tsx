"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Eye,
  Pencil,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ROLE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  roleLabel,
  statusLabel,
  toggleActionLabel,
  type MockUser,
  type MockUserRole,
  type MockUserStatus,
} from "@/components/users/mock-users";
import { cn } from "@/lib/utils";

type ActionTone = "view" | "edit" | "activate" | "deactivate" | "delete";

type UsersListProps = {
  users: MockUser[];
  highlightedUserId?: string | null;
  onView: (user: MockUser) => void;
  onEdit: (user: MockUser) => void;
  onToggleStatus: (user: MockUser) => void;
  onDelete: (user: MockUser) => void;
};

const ACTION_HOVER_STYLES: Record<ActionTone, string> = {
  view: "hover:bg-[var(--brand-navy)]/10 hover:text-[var(--brand-navy)]",
  edit: "hover:bg-[var(--brand-coral)]/12 hover:text-[var(--brand-coral)]",
  activate: "hover:bg-emerald-100/80 hover:text-emerald-700",
  deactivate: "hover:bg-amber-100/80 hover:text-amber-800",
  delete: "hover:bg-rose-100/80 hover:text-rose-700",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function RoleBadge({ role }: { role: MockUserRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset",
        role === "owner" &&
          "bg-[var(--brand-navy)]/12 text-[var(--brand-navy)] ring-[var(--brand-navy)]/15",
        role === "admin" &&
          "bg-[var(--brand-coral)]/14 text-[var(--brand-coral)] ring-[var(--brand-coral)]/20",
        role === "member" &&
          "bg-slate-200/70 text-slate-600 ring-slate-300/60"
      )}
    >
      {roleLabel(role)}
    </span>
  );
}

function StatusBadge({ status }: { status: MockUserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset",
        status === "active" &&
          "bg-emerald-100/80 text-emerald-700 ring-emerald-600/15",
        status === "pending" &&
          "bg-amber-100/80 text-amber-800 ring-amber-600/15",
        status === "inactive" &&
          "bg-rose-100/70 text-rose-700 ring-rose-500/15"
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

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
      className={cn(
        "group/action relative text-muted-foreground transition-colors",
        ACTION_HOVER_STYLES[tone]
      )}
      onClick={onClick}
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--brand-navy)] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover/action:opacity-100 group-focus-visible/action:opacity-100"
      >
        {label}
      </span>
    </Button>
  );
}

function UserActions({
  user,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  user: MockUser;
  onView: (user: MockUser) => void;
  onEdit: (user: MockUser) => void;
  onToggleStatus: (user: MockUser) => void;
  onDelete: (user: MockUser) => void;
}) {
  const toggleLabel = toggleActionLabel(user.status);
  const canActivate = user.status !== "active";
  const canDelete = user.role !== "owner";

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
      {canDelete ? (
        <ActionIconButton
          label="Excluir"
          tone="delete"
          onClick={() => onDelete(user)}
        >
          <Trash2 className="h-4 w-4" />
        </ActionIconButton>
      ) : null}
    </div>
  );
}

export function UsersList({
  users,
  highlightedUserId = null,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: UsersListProps) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<MockUserRole | "all">("all");
  const [status, setStatus] = useState<MockUserStatus | "all">("all");

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      const matchesRole = role === "all" || user.role === role;
      const matchesStatus = status === "all" || user.status === status;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, role, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[28rem]">
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as MockUserRole | "all")}
            aria-label="Filtrar por perfil"
          >
            {ROLE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as MockUserStatus | "all")
            }
            aria-label="Filtrar por status"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Nenhum usuário encontrado</CardTitle>
            <CardDescription>
              Ajuste a busca ou os filtros para visualizar outros usuários.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-[var(--brand-navy)]/10 md:block">
            <div className="overflow-x-auto pb-8">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[var(--brand-navy)]/[0.045] text-left">
                  <tr className="border-b border-[var(--brand-navy)]/10 shadow-[inset_0_-1px_0_rgba(17,32,59,0.06)]">
                    <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                      Usuário
                    </th>
                    <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                      E-mail
                    </th>
                    <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                      Perfil
                    </th>
                    <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-[13px] font-semibold text-[var(--brand-navy)]">
                      Último acesso
                    </th>
                    <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-[var(--brand-navy)]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isHighlighted = user.id === highlightedUserId;

                    return (
                      <tr
                        key={user.id}
                        className={cn(
                          "border-t border-[var(--brand-navy)]/[0.06] transition-colors duration-150",
                          isHighlighted
                            ? "bg-[var(--brand-navy)]/[0.06]"
                            : "hover:bg-[var(--brand-coral)]/[0.04]"
                        )}
                      >
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-[var(--brand-navy)]/[0.08] text-xs font-semibold text-[var(--brand-navy)]">
                                {initials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-medium text-[var(--brand-navy)]">
                              {user.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="px-5 py-4 align-middle text-muted-foreground">
                          {user.lastAccess}
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <UserActions
                            user={user}
                            onView={onView}
                            onEdit={onEdit}
                            onToggleStatus={onToggleStatus}
                            onDelete={onDelete}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-3 md:hidden">
            {filteredUsers.map((user) => {
              const isHighlighted = user.id === highlightedUserId;

              return (
                <Card
                  key={user.id}
                  className={cn(
                    "shadow-sm transition-colors",
                    isHighlighted &&
                      "border-[var(--brand-navy)]/20 bg-[var(--brand-navy)]/[0.04]"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[var(--brand-navy)]/[0.08] text-xs font-semibold text-[var(--brand-navy)]">
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-1">
                        <CardTitle className="text-base text-[var(--brand-navy)]">
                          {user.name}
                        </CardTitle>
                        <CardDescription className="truncate">
                          {user.email}
                        </CardDescription>
                      </div>
                      <StatusBadge status={user.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <p className="text-muted-foreground">Perfil</p>
                        <RoleBadge role={user.role} />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-muted-foreground">Último acesso</p>
                        <p>{user.lastAccess}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end border-t pt-3">
                      <UserActions
                        user={user}
                        onView={onView}
                        onEdit={onEdit}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
