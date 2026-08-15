import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildSeatUsageSnapshot,
  type SeatUsageSnapshot,
} from "@/lib/plans/limits";
import { normalizeCompanyPlan } from "@/lib/plans/entitlements";

export type SeatCountOptions = {
  companyId: string;
  /** Convite que será convertido/renovado e não deve contar nesta checagem. */
  excludeInviteId?: string | null;
  /** Membership sendo reativado (já inactive — normalmente fora do count). */
  excludeMembershipId?: string | null;
  /** Usar admin client (aceite / service paths). */
  useAdmin?: boolean;
};

function isInviteValidPending(row: {
  status: string;
  expires_at: string;
}): boolean {
  if (row.status !== "pending") return false;
  return new Date(row.expires_at).getTime() > Date.now();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbLike = { from: (table: string) => any };

/**
 * Contagem canônica de seats por empresa.
 * usedSeats = active members + pending invites não expirados.
 * Aceito/cancelado/expirado/inactive não ocupam vaga.
 */
export async function getCompanySeatUsage(
  options: SeatCountOptions
): Promise<SeatUsageSnapshot | { error: string }> {
  const companyId = options.companyId;
  if (!companyId) {
    return { error: "Empresa obrigatória para calcular vagas." };
  }

  const db = (
    options.useAdmin ? createAdminClient() : await createClient()
  ) as DbLike;

  const { data: company, error: companyError } = await db
    .from("companies")
    .select("plan")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    return { error: `Não foi possível carregar o plano: ${companyError.message}` };
  }
  if (!company) {
    return { error: "Empresa não encontrada." };
  }

  const plan = normalizeCompanyPlan(
    (company as { plan?: string }).plan
  );

  let membersQuery = db
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active");

  if (options.excludeMembershipId) {
    membersQuery = membersQuery.neq("id", options.excludeMembershipId);
  }

  const { count: activeCount, error: membersError } = await membersQuery;

  if (membersError) {
    return {
      error: `Não foi possível contar membros ativos: ${membersError.message}`,
    };
  }

  const { data: inviteRows, error: invitesError } = await db
    .from("company_invites")
    .select("id, status, expires_at")
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (invitesError) {
    return {
      error: `Não foi possível contar convites: ${invitesError.message}`,
    };
  }

  const pendingValidInvites = (
    (inviteRows ?? []) as Array<{
      id: string;
      status: string;
      expires_at: string;
    }>
  ).filter((invite) => {
    if (
      options.excludeInviteId &&
      invite.id === options.excludeInviteId
    ) {
      return false;
    }
    return isInviteValidPending(invite);
  }).length;

  return buildSeatUsageSnapshot({
    plan,
    activeMembers: activeCount ?? 0,
    pendingValidInvites,
  });
}

export async function assertCompanyHasAvailableSeat(
  options: SeatCountOptions & { forReactivate?: boolean; forAccept?: boolean }
): Promise<{ ok: true; snapshot: SeatUsageSnapshot } | { ok: false; message: string }> {
  const result = await getCompanySeatUsage(options);
  if ("error" in result) {
    return { ok: false, message: result.error };
  }

  if (result.usedSeats >= result.maxUsers) {
    const {
      seatAcceptBlockedMessage,
      seatLimitReachedMessage,
      seatReactivateBlockedMessage,
    } = await import("@/lib/plans/limits");
    if (options.forAccept) {
      return { ok: false, message: seatAcceptBlockedMessage() };
    }
    if (options.forReactivate) {
      return { ok: false, message: seatReactivateBlockedMessage() };
    }
    return { ok: false, message: seatLimitReachedMessage(result) };
  }

  return { ok: true, snapshot: result };
}
