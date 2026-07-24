type SupabaseEnvVar =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

function getEnvVar(name: SupabaseEnvVar): string {
  const value = process.env[name]?.trim();

  if (!value || value.startsWith("your-")) {
    throw new Error(
      `Variável de ambiente ausente ou inválida: ${name}. ` +
        "Configure o arquivo .env.local com as credenciais do Supabase."
    );
  }

  return value;
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: getEnvVar("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
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
