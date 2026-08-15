import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * E-mails (separados por vírgula) autorizados como Super Admin de bootstrap.
 * Somente servidor. Não substitui platform_admins em produção — use a tabela.
 */
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
 * Verifica Super Admin da plataforma.
 * 1) RPC is_platform_admin() (tabela platform_admins)
 * 2) Fallback opcional: PLATFORM_ADMIN_EMAILS (bootstrap)
 *
 * Nunca usa company_members.role (owner/admin de tenant ≠ Super Admin).
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data: fromDb, error: rpcError } = await supabase.rpc(
    "is_platform_admin"
  );

  if (!rpcError && fromDb === true) {
    return true;
  }

  const email = user.email?.trim().toLowerCase();
  if (email && platformAdminEmailsFromEnv().has(email)) {
    return true;
  }

  return false;
}

/**
 * Gate de servidor para rotas/actions /admin/*.
 * Usuário comum autenticado recebe 404 (não revela o painel).
 */
export async function requirePlatformAdmin(): Promise<void> {
  const allowed = await isPlatformAdmin();
  if (!allowed) {
    notFound();
  }
}
