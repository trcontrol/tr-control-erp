export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

export type SupabaseAdminEnv = {
  url: string;
  serviceRoleKey: string;
};

function isValidEnvValue(value: string | undefined): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed && !trimmed.startsWith("your-"));
}

export function getSupabaseEnv(): SupabaseEnv {
  // Acesso estático obrigatório: Next.js só embute NEXT_PUBLIC_* no cliente assim.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!isValidEnvValue(supabaseUrl)) {
    throw new Error(
      "Variável de ambiente ausente ou inválida: NEXT_PUBLIC_SUPABASE_URL. " +
        "Configure o arquivo .env.local com as credenciais do Supabase."
    );
  }

  if (!isValidEnvValue(supabasePublishableKey)) {
    throw new Error(
      "Variável de ambiente ausente ou inválida: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Configure o arquivo .env.local com as credenciais do Supabase."
    );
  }

  return {
    url: supabaseUrl.trim(),
    publishableKey: supabasePublishableKey.trim(),
  };
}

export function hasSupabaseEnv(): boolean {
  try {
    getSupabaseEnv();
    return true;
  } catch {
    return false;
  }
}
