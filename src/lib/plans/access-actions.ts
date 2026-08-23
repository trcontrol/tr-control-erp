"use server";

import { resolveMemberAccessSnapshot } from "@/lib/plans/require-module-access";
import type { PermissionModuleId } from "@/lib/users/permissions";

export async function getMemberAccessAction(companyId: string): Promise<{
  plan: string;
  entitledModules: PermissionModuleId[];
  allowedModules: PermissionModuleId[];
  creatableModules: PermissionModuleId[];
  editableModules: PermissionModuleId[];
  deletableModules: PermissionModuleId[];
} | null> {
  const snapshot = await resolveMemberAccessSnapshot(companyId);
  if (!snapshot) return null;
  return {
    plan: snapshot.plan,
    entitledModules: snapshot.entitledModules,
    allowedModules: snapshot.allowedModules,
    creatableModules: snapshot.creatableModules,
    editableModules: snapshot.editableModules,
    deletableModules: snapshot.deletableModules,
  };
}
