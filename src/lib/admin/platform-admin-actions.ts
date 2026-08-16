"use server";

import { createClient } from "@/lib/supabase/server";

export type PlatformAdminCheckResult =
  | { ok: true; allowed: boolean }
  | { ok: false };

function platformAdminEmailsFromEnv(): Set<string> {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Recheck Super Admin for client menu refresh.
 * Distinguishes confirmed false from transport/auth/RPC failure:
 * - { ok: true, allowed } → authoritative result
 * - { ok: false } → recheck failed; caller must preserve prior state
 *
 * Authorization rules match isPlatformAdmin() (RPC then env fallback).
 * Does not throw; errors become { ok: false }.
 */
export async function checkPlatformAdminAction(): Promise<PlatformAdminCheckResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { ok: false };
    }

    if (!user) {
      return { ok: true, allowed: false };
    }

    const { data: fromDb, error: rpcError } = await supabase.rpc(
      "is_platform_admin"
    );

    if (rpcError) {
      return { ok: false };
    }

    if (fromDb === true) {
      return { ok: true, allowed: true };
    }

    const email = user.email?.trim().toLowerCase();
    if (email && platformAdminEmailsFromEnv().has(email)) {
      return { ok: true, allowed: true };
    }

    return { ok: true, allowed: false };
  } catch {
    return { ok: false };
  }
}
