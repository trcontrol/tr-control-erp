import { COMPANY_PLANS, type CompanyPlan } from "@/lib/constants";
import { normalizeCompanyPlan } from "@/lib/plans/entitlements";

const PLAN_DISPLAY_NAME: Record<CompanyPlan, string> = {
  [COMPANY_PLANS.essential]: "Essencial",
  [COMPANY_PLANS.professional]: "Profissional",
  [COMPANY_PLANS.premium]: "Premium",
};

function planDisplayName(plan: CompanyPlan): string {
  return PLAN_DISPLAY_NAME[plan] ?? plan;
}

/**
 * Limites comerciais por plano (V1) — separado de PLAN_MODULE_ENTITLEMENTS.
 * Seats são por company_id (tenant). Owner conta no limite.
 *
 * IMPORTANTE: seats vinculados ao plano-base (companies.plan), NÃO aos
 * módulos efetivos. Conceder `users` (ou outros) via company_module_overrides
 * a um Essencial NÃO aumenta automaticamente o limite de vagas.
 */
export const PLAN_LIMITS_VERSION = 1 as const;

export type PlanLimits = {
  /** Máximo de vagas (ativos + convites pending válidos). */
  maxUsers: number;
};

export const PLAN_LIMITS: Record<CompanyPlan, PlanLimits> = {
  [COMPANY_PLANS.essential]: { maxUsers: 1 },
  [COMPANY_PLANS.professional]: { maxUsers: 3 },
  [COMPANY_PLANS.premium]: { maxUsers: 7 },
};

export function maxUsersForPlan(
  plan: CompanyPlan | string | null | undefined
): number {
  return PLAN_LIMITS[normalizeCompanyPlan(plan)].maxUsers;
}

export type SeatUsageSnapshot = {
  plan: CompanyPlan;
  maxUsers: number;
  activeMembers: number;
  pendingValidInvites: number;
  usedSeats: number;
  availableSeats: number;
  isAtLimit: boolean;
};

export function buildSeatUsageSnapshot(params: {
  plan: CompanyPlan | string | null | undefined;
  activeMembers: number;
  pendingValidInvites: number;
}): SeatUsageSnapshot {
  const plan = normalizeCompanyPlan(params.plan);
  const maxUsers = maxUsersForPlan(plan);
  const activeMembers = Math.max(0, params.activeMembers);
  const pendingValidInvites = Math.max(0, params.pendingValidInvites);
  const usedSeats = activeMembers + pendingValidInvites;
  const availableSeats = Math.max(0, maxUsers - usedSeats);

  return {
    plan,
    maxUsers,
    activeMembers,
    pendingValidInvites,
    usedSeats,
    availableSeats,
    isAtLimit: usedSeats >= maxUsers,
  };
}

export function canFitSeatUsage(
  usedOrSnapshot: number | SeatUsageSnapshot,
  targetPlan: CompanyPlan | string | null | undefined
): boolean {
  const used =
    typeof usedOrSnapshot === "number"
      ? usedOrSnapshot
      : usedOrSnapshot.usedSeats;
  return used <= maxUsersForPlan(targetPlan);
}

export function seatLimitReachedMessage(snapshot: SeatUsageSnapshot): string {
  const planName = planDisplayName(snapshot.plan);
  return (
    `Limite de usuários atingido. Seu plano ${planName} permite até ${snapshot.maxUsers} ` +
    `usuários. Inative um usuário, cancele um convite pendente ou faça upgrade do plano ` +
    `para adicionar outro acesso.`
  );
}

export function seatReactivateBlockedMessage(): string {
  return "Não é possível reativar este usuário porque o limite de usuários do plano foi atingido.";
}

export function seatAcceptBlockedMessage(): string {
  return (
    "Não foi possível concluir o acesso porque o limite de usuários do plano foi atingido. " +
    "Entre em contato com o administrador da empresa."
  );
}

export function seatDowngradeBlockedMessage(params: {
  targetPlan: CompanyPlan;
  usedSeats: number;
  maxUsers: number;
}): string {
  const planName = planDisplayName(params.targetPlan);
  const toFree = Math.max(0, params.usedSeats - params.maxUsers);
  return (
    `Não é possível concluir o downgrade neste momento.\n\n` +
    `O plano ${planName} permite até ${params.maxUsers} usuários ativos/reservados e esta empresa ` +
    `possui ${params.usedSeats} acessos em uso.\n\n` +
    `Antes de alterar o plano, acesse Usuários e mantenha ativos apenas os usuários que ` +
    `continuarão utilizando o sistema. Inative os demais usuários e/ou cancele convites pendentes.\n\n` +
    (toFree > 0
      ? `É necessário liberar ${toFree} vaga${toFree === 1 ? "" : "s"} antes de concluir o downgrade.`
      : `Após a regularização, tente alterar o plano novamente.`)
  );
}
