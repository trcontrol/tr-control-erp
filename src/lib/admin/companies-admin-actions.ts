"use server";

import { revalidatePath } from "next/cache";
import {
  createCompanyWithOwnerInvite,
  deleteCompanyForPlatformAdmin,
  getAdminCompanyDeletionCounts,
  resendInitialOwnerInvite,
  updateCompanyCommercial,
} from "@/lib/admin/companies-admin";
import type {
  AdminCompanyDeletionCounts,
  CreateCompanyWithOwnerInput,
  CreateCompanyWithOwnerResult,
  DeleteCompanyInput,
  DeleteCompanyResult,
  UpdateCompanyCommercialInput,
  UpdateCompanyCommercialResult,
} from "@/lib/admin/companies-admin-shared";
import { requirePlatformAdmin } from "@/lib/admin/platform-admin";
import { ROUTES } from "@/lib/constants";
import type { SeatUsageSnapshot } from "@/lib/plans/limits";
import { getCompanySeatUsage } from "@/lib/plans/seats";

export async function createCompanyWithOwnerInviteAction(
  input: CreateCompanyWithOwnerInput
): Promise<CreateCompanyWithOwnerResult | { error: string }> {
  return createCompanyWithOwnerInvite(input);
}

export async function resendInitialOwnerInviteAction(params: {
  companyId: string;
  inviteId: string;
}): Promise<{ message: string } | { error: string }> {
  return resendInitialOwnerInvite(params);
}

/** Super Admin: atualiza somente plan + status. */
export async function updateCompanyCommercialAction(
  input: UpdateCompanyCommercialInput
): Promise<UpdateCompanyCommercialResult | { error: string }> {
  const result = await updateCompanyCommercial(input);

  if (!("error" in result)) {
    revalidatePath(ROUTES.adminCompanies);
    revalidatePath("/", "layout");
  }

  return result;
}

/** Super Admin: snapshot de seats para o modal Alterar plano. */
export async function getAdminCompanySeatUsageAction(
  companyId: string
): Promise<SeatUsageSnapshot | { error: string }> {
  await requirePlatformAdmin();
  const result = await getCompanySeatUsage({
    companyId,
    useAdmin: true,
  });
  if ("error" in result) {
    return { error: result.error };
  }
  return result;
}

/** Super Admin: contagens informativas para o modal de exclusão. */
export async function getAdminCompanyDeletionCountsAction(
  companyId: string
): Promise<AdminCompanyDeletionCounts | { error: string }> {
  return getAdminCompanyDeletionCounts(companyId);
}

/** Super Admin: exclusão definitiva do tenant. */
export async function deleteCompanyForPlatformAdminAction(
  input: DeleteCompanyInput
): Promise<DeleteCompanyResult | { error: string }> {
  const result = await deleteCompanyForPlatformAdmin(input);

  if (!("error" in result)) {
    revalidatePath(ROUTES.adminCompanies);
    revalidatePath("/", "layout");
  }

  return result;
}
