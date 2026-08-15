"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PendingInvitesPanel } from "@/components/users/pending-invites-panel";
import { UserCard } from "@/components/users/user-card";
import { UserEditDialog } from "@/components/users/user-edit-dialog";
import { UserInviteDialog } from "@/components/users/user-invite-dialog";
import { UserPermissionsDialog } from "@/components/users/user-permissions-dialog";
import { UserStatusConfirmDialog } from "@/components/users/user-status-confirm-dialog";
import { UserViewDialog } from "@/components/users/user-view-dialog";
import { UsersFilters } from "@/components/users/users-filters";
import { UsersKpiCards } from "@/components/users/users-kpi-cards";
import { UsersPagination } from "@/components/users/users-pagination";
import { UsersTable } from "@/components/users/users-table";
import type { CompanyRole } from "@/lib/constants";
import { getCompanySeatUsageAction } from "@/lib/plans/seat-actions";
import {
  seatLimitReachedMessage,
  type SeatUsageSnapshot,
} from "@/lib/plans/limits";
import {
  computeUserKpis,
  filterAndSortUsers,
  listCompanyUsers,
  type CompanyUser,
} from "@/lib/users/actions";
import {
  USERS_PAGE_SIZE,
  type UserSortOption,
  type UserStatus,
} from "@/lib/users/format";
import type { AccessProfileId } from "@/lib/users/permissions";

type UsersBoardProps = {
  companyId: string;
  companyName: string;
};

export function UsersBoard({ companyId, companyName }: UsersBoardProps) {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<CompanyRole | "all">("all");
  const [status, setStatus] = useState<UserStatus | "all">("all");
  const [sort, setSort] = useState<UserSortOption>("name_asc");
  const [page, setPage] = useState(1);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitesRefreshKey, setInvitesRefreshKey] = useState(0);
  const [viewUser, setViewUser] = useState<CompanyUser | null>(null);
  const [editUser, setEditUser] = useState<CompanyUser | null>(null);
  const [accessUser, setAccessUser] = useState<CompanyUser | null>(null);
  const [accessInitialProfile, setAccessInitialProfile] =
    useState<AccessProfileId | null>(null);
  const [statusUser, setStatusUser] = useState<CompanyUser | null>(null);
  const [seats, setSeats] = useState<SeatUsageSnapshot | null>(null);
  const [seatsLoading, setSeatsLoading] = useState(true);

  const loadSeats = useCallback(async () => {
    if (!companyId) {
      setSeats(null);
      setSeatsLoading(false);
      return;
    }
    setSeatsLoading(true);
    const result = await getCompanySeatUsageAction(companyId);
    if (result.error) {
      setSeats(null);
      setSeatsLoading(false);
      return;
    }
    setSeats(result.data);
    setSeatsLoading(false);
  }, [companyId]);

  const loadUsers = useCallback(async () => {
    if (!companyId) {
      setUsers([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar usuários.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listCompanyUsers({
      companyId,
      companyName,
    });

    if (result.error) {
      setUsers([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setUsers(result.data);
    setLoading(false);
    void loadSeats();
  }, [companyId, companyName, loadSeats]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, role, status, sort, companyId]);

  const kpis = useMemo(
    () => computeUserKpis(users, seats?.pendingValidInvites ?? 0),
    [users, seats?.pendingValidInvites]
  );

  const atSeatLimit = Boolean(seats?.isAtLimit);

  const filteredUsers = useMemo(
    () =>
      filterAndSortUsers(users, {
        search,
        role,
        status,
        sort,
      }),
    [users, search, role, status, sort]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / USERS_PAGE_SIZE)
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageStart = (page - 1) * USERS_PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(
    pageStart,
    pageStart + USERS_PAGE_SIZE
  );

  const highlightedUserId =
    viewUser?.id ?? editUser?.id ?? accessUser?.id ?? statusUser?.id ?? null;

  function openConfigureAccess(
    user: CompanyUser,
    profile?: AccessProfileId
  ) {
    setAccessInitialProfile(profile ?? null);
    setAccessUser(user);
  }

  return (
    <div className="space-y-6" data-testid="users-board">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-[var(--brand-navy)]">
            Usuários do plano
          </p>
          <p className="text-sm text-muted-foreground">
            {seatsLoading || !seats
              ? "Calculando vagas..."
              : `${seats.usedSeats} de ${seats.maxUsers} vagas utilizadas` +
                (seats.pendingValidInvites > 0
                  ? ` (${seats.activeMembers} ativos + ${seats.pendingValidInvites} convite${seats.pendingValidInvites === 1 ? "" : "s"} pendente${seats.pendingValidInvites === 1 ? "" : "s"})`
                  : ` (${seats.activeMembers} ativos)`)}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button
            type="button"
            className="bg-[var(--brand-coral)] text-white shadow-sm hover:bg-[var(--brand-coral)]/90"
            disabled={atSeatLimit}
            title={
              atSeatLimit && seats ? seatLimitReachedMessage(seats) : undefined
            }
            onClick={() => setInviteOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Novo usuário
          </Button>
          {atSeatLimit && seats ? (
            <p className="max-w-md text-xs text-amber-900 sm:text-right">
              {seatLimitReachedMessage(seats)}
            </p>
          ) : null}
        </div>
      </div>

      <UsersKpiCards kpis={kpis} loading={loading || seatsLoading} />

      <PendingInvitesPanel
        companyId={companyId}
        refreshKey={invitesRefreshKey}
        onInvitesChanged={() => {
          void loadSeats();
          void loadUsers();
        }}
      />

      <UsersFilters
        search={search}
        role={role}
        status={status}
        sort={sort}
        totalFiltered={filteredUsers.length}
        totalUsers={users.length}
        onSearchChange={setSearch}
        onRoleChange={setRole}
        onStatusChange={setStatus}
        onSortChange={setSort}
      />

      {loading ? (
        <Card className="rounded-2xl border-[var(--brand-navy)]/10 shadow-sm">
          <CardHeader className="items-center text-center">
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-[var(--brand-coral)]" />
            <CardTitle>Carregando usuários</CardTitle>
            <CardDescription>
              Buscando os membros vinculados a {companyName}.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : error ? (
        <Card className="rounded-2xl border-destructive/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-destructive">
              Não foi possível carregar os usuários
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadUsers()}
            >
              Tentar novamente
            </Button>
          </div>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card className="rounded-2xl border-[var(--brand-navy)]/10 shadow-sm">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-navy)]/8">
              <Users className="h-6 w-6 text-[var(--brand-navy)]" />
            </div>
            <CardTitle>
              {users.length === 0
                ? "Nenhum usuário vinculado"
                : "Nenhum usuário encontrado"}
            </CardTitle>
            <CardDescription>
              {users.length === 0
                ? "Use Novo usuário para convidar o primeiro membro quando a migration estiver autorizada."
                : "Ajuste a busca ou os filtros para visualizar outros usuários."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <UsersTable
            users={paginatedUsers}
            highlightedUserId={highlightedUserId}
            onView={setViewUser}
            onEdit={setEditUser}
            onConfigureAccess={(user) => openConfigureAccess(user)}
            onToggleStatus={setStatusUser}
          />

          <div className="grid gap-3 md:hidden">
            {paginatedUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onView={setViewUser}
                onEdit={setEditUser}
                onConfigureAccess={(item) => openConfigureAccess(item)}
                onToggleStatus={setStatusUser}
              />
            ))}
          </div>

          <UsersPagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            pageSize={USERS_PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}

      <UserInviteDialog
        companyId={companyId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={() => {
          setInvitesRefreshKey((value) => value + 1);
          void loadUsers();
          void loadSeats();
        }}
      />

      <UserViewDialog
        user={viewUser}
        open={Boolean(viewUser)}
        onOpenChange={(open) => {
          if (!open) setViewUser(null);
        }}
        onEdit={setEditUser}
        onConfigureAccess={(user) => openConfigureAccess(user)}
      />

      <UserEditDialog
        user={editUser}
        open={Boolean(editUser)}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
        onSaved={() => {
          void loadUsers();
          void loadSeats();
        }}
        onConfigureAccess={(user, profile) => {
          setEditUser(null);
          openConfigureAccess(user, profile);
        }}
      />

      <UserPermissionsDialog
        user={accessUser}
        open={Boolean(accessUser)}
        initialProfile={accessInitialProfile}
        onOpenChange={(open) => {
          if (!open) {
            setAccessUser(null);
            setAccessInitialProfile(null);
          }
        }}
        onSaved={() => {
          void loadUsers();
        }}
      />

      <UserStatusConfirmDialog
        user={statusUser}
        open={Boolean(statusUser)}
        onOpenChange={(open) => {
          if (!open) setStatusUser(null);
        }}
        onSaved={() => {
          void loadUsers();
          void loadSeats();
        }}
      />
    </div>
  );
}
