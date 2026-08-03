"use client";

import { useMemo, useState } from "react";
import {
  Clock3,
  Shield,
  UserX,
  Users,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  computeUserKpis,
  createMockUserId,
  INITIAL_MOCK_USERS,
  isEmailTaken,
  nextStatusAfterToggle,
  roleLabel,
  statusLabel,
  toggleActionLabel,
  type MockUser,
  type MockUserInput,
} from "@/components/users/mock-users";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { UsersList } from "@/components/users/users-list";
import { cn } from "@/lib/utils";

const KPI_META = [
  {
    key: "active" as const,
    title: "Usuários ativos",
    hint: "Com acesso liberado na empresa",
    icon: Users,
    tone: "positive" as const,
  },
  {
    key: "administrators" as const,
    title: "Administradores",
    hint: "Com permissões de gestão",
    icon: Shield,
    tone: "default" as const,
  },
  {
    key: "pending" as const,
    title: "Usuários pendentes",
    hint: "Aguardando confirmação de acesso",
    icon: Clock3,
    tone: "neutral" as const,
  },
  {
    key: "inactive" as const,
    title: "Usuários inativos",
    hint: "Acesso temporariamente suspenso",
    icon: UserX,
    tone: "negative" as const,
  },
];

const KPI_CARD_STYLES = {
  positive:
    "border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 to-emerald-50/40",
  default:
    "border-[var(--brand-navy)]/10 bg-gradient-to-br from-[var(--brand-navy)]/[0.06] to-[var(--brand-navy)]/[0.02]",
  neutral:
    "border-amber-100/80 bg-gradient-to-br from-amber-50/90 to-amber-50/40",
  negative:
    "border-[var(--brand-coral)]/15 bg-gradient-to-br from-[var(--brand-coral)]/[0.08] to-[var(--brand-coral)]/[0.03]",
} as const;

const KPI_ICON_STYLES = {
  positive:
    "bg-emerald-100/80 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  default:
    "bg-[var(--brand-navy)]/10 text-[var(--brand-navy)] ring-1 ring-inset ring-[var(--brand-navy)]/15",
  neutral:
    "bg-amber-100/80 text-amber-800 ring-1 ring-inset ring-amber-600/20",
  negative:
    "bg-[var(--brand-coral)]/15 text-[var(--brand-coral)] ring-1 ring-inset ring-[var(--brand-coral)]/20",
} as const;

const KPI_VALUE_STYLES = {
  positive: "text-emerald-800",
  default: "text-[var(--brand-navy)]",
  neutral: "text-amber-900",
  negative: "text-[var(--brand-coral)]",
} as const;

export function UsersBoard() {
  const [users, setUsers] = useState<MockUser[]>(INITIAL_MOCK_USERS);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<MockUser | null>(null);
  const [viewUser, setViewUser] = useState<MockUser | null>(null);
  const [toggleUser, setToggleUser] = useState<MockUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<MockUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const kpis = useMemo(() => computeUserKpis(users), [users]);
  const highlightedUserId = viewUser?.id ?? editUser?.id ?? null;

  function handleCreate(values: MockUserInput) {
    if (isEmailTaken(users, values.email)) {
      setFormError("Já existe um usuário com este e-mail.");
      return false;
    }

    setUsers((current) => [
      {
        id: createMockUserId(),
        name: values.name,
        email: values.email,
        role: values.role,
        status: values.status,
        lastAccess: "Nunca acessou",
      },
      ...current,
    ]);
    setFormError(null);
    return true;
  }

  function handleEdit(values: MockUserInput) {
    if (!editUser) return false;

    if (isEmailTaken(users, values.email, editUser.id)) {
      setFormError("Já existe um usuário com este e-mail.");
      return false;
    }

    setUsers((current) =>
      current.map((user) =>
        user.id === editUser.id
          ? {
              ...user,
              name: values.name,
              email: values.email,
              role: values.role,
              status: values.status,
            }
          : user
      )
    );
    setFormError(null);
    setEditUser(null);
    return true;
  }

  function handleConfirmToggle() {
    if (!toggleUser) return;

    const nextStatus = nextStatusAfterToggle(toggleUser.status);

    setUsers((current) =>
      current.map((user) =>
        user.id === toggleUser.id ? { ...user, status: nextStatus } : user
      )
    );
    setToggleUser(null);
  }

  function handleRequestDelete(user: MockUser) {
    if (user.role === "owner") return;
    setDeleteUser(user);
  }

  function handleConfirmDelete() {
    if (!deleteUser || deleteUser.role === "owner") return;

    setUsers((current) =>
      current.filter((user) => user.id !== deleteUser.id)
    );
    setDeleteUser(null);

    if (viewUser?.id === deleteUser.id) setViewUser(null);
    if (editUser?.id === deleteUser.id) setEditUser(null);
    if (toggleUser?.id === deleteUser.id) setToggleUser(null);
  }

  const toggleNextStatus = toggleUser
    ? nextStatusAfterToggle(toggleUser.status)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          className="bg-[var(--brand-coral)] text-white shadow-sm hover:bg-[var(--brand-coral)]/90"
          onClick={() => {
            setFormError(null);
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_META.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <Card
              key={kpi.title}
              className={cn("shadow-sm", KPI_CARD_STYLES[kpi.tone])}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <CardDescription className="text-[13px] font-medium text-[var(--brand-navy)]/65">
                  {kpi.title}
                </CardDescription>
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    KPI_ICON_STYLES[kpi.tone]
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.15} />
                </span>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <p
                  className={cn(
                    "text-[2rem] font-bold leading-none tracking-tight tabular-nums",
                    KPI_VALUE_STYLES[kpi.tone]
                  )}
                >
                  {kpis[kpi.key]}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {kpi.hint}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <UsersList
        users={users}
        highlightedUserId={highlightedUserId}
        onView={setViewUser}
        onEdit={(user) => {
          setFormError(null);
          setEditUser(user);
        }}
        onToggleStatus={setToggleUser}
        onDelete={handleRequestDelete}
      />

      <UserFormDialog
        open={createOpen}
        mode="create"
        error={formError}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setFormError(null);
        }}
        onSubmit={handleCreate}
      />

      <UserFormDialog
        open={Boolean(editUser)}
        mode="edit"
        user={editUser}
        error={formError}
        onOpenChange={(open) => {
          if (!open) {
            setEditUser(null);
            setFormError(null);
          }
        }}
        onSubmit={handleEdit}
      />

      <Dialog
        open={Boolean(viewUser)}
        onOpenChange={(open) => {
          if (!open) setViewUser(null);
        }}
        title="Detalhes do usuário"
        description="Visualização somente leitura dos dados locais"
        className="max-w-lg"
      >
        {viewUser ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Nome completo
                </p>
                <p className="text-sm font-medium text-[var(--brand-navy)]">
                  {viewUser.name}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  E-mail
                </p>
                <p className="text-sm">{viewUser.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Perfil
                </p>
                <p className="text-sm">{roleLabel(viewUser.role)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Status
                </p>
                <p className="text-sm">{statusLabel(viewUser.status)}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Último acesso
                </p>
                <p className="text-sm">{viewUser.lastAccess}</p>
              </div>
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button type="button" onClick={() => setViewUser(null)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(toggleUser)}
        onOpenChange={(open) => {
          if (!open) setToggleUser(null);
        }}
        title={
          toggleUser
            ? `${toggleActionLabel(toggleUser.status)} usuário`
            : "Alterar status"
        }
        description="Confirme a alteração de status na lista local"
        className="max-w-md"
      >
        {toggleUser && toggleNextStatus ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Deseja{" "}
              <span className="font-medium text-foreground">
                {toggleActionLabel(toggleUser.status).toLowerCase()}
              </span>{" "}
              o usuário{" "}
              <span className="font-medium text-[var(--brand-navy)]">
                {toggleUser.name}
              </span>
              ? O status passará de{" "}
              <span className="font-medium text-foreground">
                {statusLabel(toggleUser.status)}
              </span>{" "}
              para{" "}
              <span className="font-medium text-foreground">
                {statusLabel(toggleNextStatus)}
              </span>
              .
            </p>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setToggleUser(null)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirmToggle}>
                Confirmar
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(deleteUser)}
        onOpenChange={(open) => {
          if (!open) setDeleteUser(null);
        }}
        title="Excluir usuário"
        description="Esta ação remove o usuário apenas da lista local"
        className="max-w-md"
      >
        {deleteUser ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza de que deseja excluir este usuário?
            </p>
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium text-[var(--brand-navy)]">
                {deleteUser.name}
              </p>
              <p className="mt-0.5 text-muted-foreground">{deleteUser.email}</p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteUser(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
              >
                Excluir usuário
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
