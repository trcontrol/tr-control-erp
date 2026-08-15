import type { SupabaseAdminEnv } from "@/lib/supabase/env";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Validação da chave Admin/service role do Supabase.
 * Aceita:
 * - chave moderna: sb_secret_...
 * - chave legada JWT: eyJ...
 *
 * Nunca logar o valor. Nunca usar NEXT_PUBLIC_.
 */
export function isValidServiceRoleKey(
  value: string | undefined
): value is string {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("your-")) return false;
  return trimmed.startsWith("sb_secret_") || trimmed.startsWith("eyJ");
}

/**
 * Credenciais Admin — importar somente em código server-side
 * (ex.: src/lib/supabase/admin.ts). Não importar em Client Components.
 */
export function getSupabaseAdminEnv(): SupabaseAdminEnv {
  const { url } = getSupabaseEnv();
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceRoleKey = raw?.trim();

  if (!serviceRoleKey) {
    throw new Error(
      "Variável de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY. " +
        "Configure a service role / secret key somente no servidor (.env.local / secrets), sem NEXT_PUBLIC_."
    );
  }

  if (!isValidServiceRoleKey(serviceRoleKey)) {
    throw new Error(
      "Variável de ambiente inválida: SUPABASE_SERVICE_ROLE_KEY. " +
        "Use uma Secret Key (sb_secret_...) ou a service_role legada (JWT iniciada por eyJ)."
    );
  }

  return {
    url,
    serviceRoleKey,
  };
}
