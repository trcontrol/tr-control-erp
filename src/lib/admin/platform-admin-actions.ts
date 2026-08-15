"use server";

import { isPlatformAdmin } from "@/lib/admin/platform-admin";

/** Atualiza o menu lateral com o status atual de Super Admin (layout pode estar stale). */
export async function checkPlatformAdminAction(): Promise<boolean> {
  return isPlatformAdmin();
}
