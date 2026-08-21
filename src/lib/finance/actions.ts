"use server";

/**
 * Finance — server actions com enforcement:
 * plan entitlement ∩ member_permissions (can_view/create/edit/delete).
 *
 * Settle/baixa → can_edit (altera lançamento existente: status + payment_date).
 * Scope (all/own/team) NÃO é aplicado nesta fase.
 *
 * Relatórios continuam lendo via entry-query + client próprio (Fase Reports).
 */
import { FINANCIAL_STATUS } from "@/lib/constants";
import {
  insertFinancialEntry,
  patchFinancialEntry,
  queryFinancialEntries,
  queryFinancialEntry,
  removeFinancialEntry,
  type FinancialEntryWithRelations,
} from "@/lib/finance/entry-query";
import { todayISODate } from "@/lib/finance/format";
import {
  filterUpcomingReceivables,
  upcomingReceivablesPeriod,
  type UpcomingReceivablesWindow,
  UPCOMING_RECEIVABLES_DEFAULT_WINDOW,
} from "@/lib/finance/upcoming";
import { assertMemberPermission } from "@/lib/plans/require-module-access";
import { createClient } from "@/lib/supabase/server";
import { PERMISSION_MODULES } from "@/lib/users/permissions";
import type {
  FinancialEntry,
  FinancialEntryInsert,
  FinancialEntryUpdate,
} from "@/types/database";

export type {
  FinancialEntryWithRelations,
  FinancialEntryWithCustomer,
} from "@/lib/finance/entry-query";

export type { UpcomingReceivablesWindow } from "@/lib/finance/upcoming";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

async function deny<T>(message: string): Promise<Result<T>> {
  return { data: null, error: { message } };
}

export async function listFinancialEntries(params: {
  companyId: string;
  entryType?: string;
  status?: string;
  search?: string;
  periodFrom?: string;
  periodTo?: string;
}): Promise<Result<FinancialEntryWithRelations[]>> {
  const authz = await assertMemberPermission({
    companyId: params.companyId,
    module: PERMISSION_MODULES.finance,
    action: "view",
  });
  if (!authz.ok) return deny(authz.message);

  const supabase = await createClient();
  return queryFinancialEntries(supabase, params);
}

/**
 * Recebíveis futuros abertos na janela (7/15/30/60 dias ou todos futuros).
 * Fonte: financial_entries via queryFinancialEntries (não usa schedules).
 * Exclui vencidos, received, paid e cancelled.
 */
export async function getUpcomingReceivables(
  companyId: string,
  window: UpcomingReceivablesWindow = UPCOMING_RECEIVABLES_DEFAULT_WINDOW
): Promise<Result<FinancialEntryWithRelations[]>> {
  const authz = await assertMemberPermission({
    companyId,
    module: PERMISSION_MODULES.finance,
    action: "view",
  });
  if (!authz.ok) return deny(authz.message);

  const { periodFrom, periodTo } = upcomingReceivablesPeriod(window);
  const supabase = await createClient();
  const result = await queryFinancialEntries(supabase, {
    companyId,
    entryType: "receivable",
    periodFrom,
    periodTo,
  });

  if (result.error || !result.data) {
    return result;
  }

  return {
    data: filterUpcomingReceivables(result.data, periodFrom),
    error: null,
  };
}

export async function getFinancialEntry(
  companyId: string,
  entryId: string
): Promise<Result<FinancialEntryWithRelations>> {
  const authz = await assertMemberPermission({
    companyId,
    module: PERMISSION_MODULES.finance,
    action: "view",
  });
  if (!authz.ok) return deny(authz.message);

  const supabase = await createClient();
  return queryFinancialEntry(supabase, companyId, entryId);
}

export async function createFinancialEntry(
  payload: FinancialEntryInsert
): Promise<Result<FinancialEntry>> {
  const companyId = payload.company_id;
  if (!companyId) {
    return deny("Empresa obrigatória para criar o lançamento.");
  }

  const authz = await assertMemberPermission({
    companyId,
    module: PERMISSION_MODULES.finance,
    action: "create",
  });
  if (!authz.ok) return deny(authz.message);

  const supabase = await createClient();
  return insertFinancialEntry(supabase, payload);
}

export async function updateFinancialEntry(
  companyId: string,
  entryId: string,
  payload: FinancialEntryUpdate
): Promise<Result<FinancialEntry>> {
  const authz = await assertMemberPermission({
    companyId,
    module: PERMISSION_MODULES.finance,
    action: "edit",
  });
  if (!authz.ok) return deny(authz.message);

  const supabase = await createClient();
  return patchFinancialEntry(supabase, companyId, entryId, payload);
}

export async function deleteFinancialEntry(
  companyId: string,
  entryId: string
): Promise<Result<true>> {
  const authz = await assertMemberPermission({
    companyId,
    module: PERMISSION_MODULES.finance,
    action: "delete",
  });
  if (!authz.ok) return deny(authz.message);

  const supabase = await createClient();
  return removeFinancialEntry(supabase, companyId, entryId);
}

/**
 * Baixa / settle: atualiza status + payment_date do lançamento existente.
 * Autorização: can_edit (não create/delete).
 */
export async function markFinancialEntrySettled(
  companyId: string,
  entry: FinancialEntry,
  paymentDate?: string
): Promise<Result<FinancialEntry>> {
  const authz = await assertMemberPermission({
    companyId,
    module: PERMISSION_MODULES.finance,
    action: "edit",
  });
  if (!authz.ok) return deny(authz.message);

  const status =
    entry.entry_type === "payable"
      ? FINANCIAL_STATUS.paid
      : FINANCIAL_STATUS.received;

  const supabase = await createClient();
  return patchFinancialEntry(supabase, companyId, entry.id, {
    status,
    payment_date: paymentDate || todayISODate(),
  });
}
