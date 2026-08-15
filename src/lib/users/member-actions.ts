"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";
import type { CompanyRole } from "@/lib/constants";
import type { UserStatus } from "@/lib/users/format";
import {
  getCompanyMemberPermissions as getCompanyMemberPermissionsServer,
  saveCompanyMemberPermissions as saveCompanyMemberPermissionsServer,
  updateCompanyMemberBasics as updateCompanyMemberBasicsServer,
  updateCompanyMemberStatus as updateCompanyMemberStatusServer,
  companyRoleForAccessProfile,
} from "@/lib/users/member-server";
import type {
  AccessProfileId,
  ModulePermissionState,
} from "@/lib/users/permissions";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export { companyRoleForAccessProfile };

export async function getCompanyMemberPermissions(params: {
  companyId: string;
  membershipId: string;
}): Promise<
  Result<{
    accessProfile: AccessProfileId;
    permissions: ModulePermissionState[];
    isPrimaryOwner: boolean;
    plan: string;
  }>
> {
  return getCompanyMemberPermissionsServer(params);
}

export async function updateCompanyMemberStatus(params: {
  companyId: string;
  membershipId: string;
  status: UserStatus;
}): Promise<Result<null>> {
  const result = await updateCompanyMemberStatusServer(params);
  if (!result.error) {
    revalidatePath(ROUTES.users);
  }
  return result;
}

export async function saveCompanyMemberPermissions(params: {
  companyId: string;
  membershipId: string;
  accessProfile: AccessProfileId;
  permissions: ModulePermissionState[];
}): Promise<Result<null>> {
  const result = await saveCompanyMemberPermissionsServer(params);
  if (!result.error) {
    revalidatePath(ROUTES.users);
  }
  return result;
}

export async function updateCompanyMemberBasics(params: {
  companyId: string;
  membershipId: string;
  userId: string;
  fullName: string;
  role: CompanyRole;
  status: UserStatus;
  accessProfile: AccessProfileId;
}): Promise<
  Result<{
    updatedRole: boolean;
    updatedName: boolean;
    updatedStatus: boolean;
    updatedProfile: boolean;
  }>
> {
  const result = await updateCompanyMemberBasicsServer(params);
  if (!result.error) {
    revalidatePath(ROUTES.users);
  }
  return result;
}
