import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseAdminEnv } from "@/lib/supabase/env-admin";

/**
 * Cliente Supabase com service role — SOMENTE servidor.
 * Nunca importar em Client Components nem expor a chave.
 */
export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseAdminEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
