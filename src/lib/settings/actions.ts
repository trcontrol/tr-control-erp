"use server";

/**
 * Settings V1 — Conta pessoal + Empresa ativa.
 * Conta: próprio profile (auth.uid), sem settings.edit.
 * Empresa: assertMemberPermission(settings, edit) + membership.
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  ACTIVE_COMPANY_COOKIE,
  parseActiveCompanyMarker,
  resolveActiveCompanyId,
} from "@/lib/auth/active-company";
import { getUserCompanies } from "@/lib/auth/session";
import { assertMemberPermission } from "@/lib/plans/require-module-access";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants";
import { PERMISSION_MODULES } from "@/lib/users/permissions";
import type { Company, CompanyUpdate } from "@/types/database";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export type OwnAccountSettings = {
  fullName: string;
  email: string | null;
};

export type ActiveCompanySettings = {
  id: string;
  name: string;
  legalName: string | null;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
};

async function deny<T>(message: string): Promise<Result<T>> {
  return { data: null, error: { message } };
}

export async function getOwnAccountSettingsAction(): Promise<
  Result<OwnAccountSettings>
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return deny("Sessão autenticada ausente.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return deny(`Não foi possível carregar o perfil: ${profileError.message}`);
  }

  return {
    data: {
      fullName:
        (profile as { full_name?: string | null } | null)?.full_name?.trim() ||
        "",
      email: user.email ?? null,
    },
    error: null,
  };
}

export async function updateOwnAccountSettingsAction(params: {
  fullName: string;
}): Promise<Result<OwnAccountSettings>> {
  const fullName = params.fullName.trim();
  if (!fullName) {
    return deny("Informe o nome.");
  }
  if (fullName.length > 120) {
    return deny("O nome deve ter no máximo 120 caracteres.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return deny("Sessão autenticada ausente.");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ full_name: fullName } as never)
    .eq("id", user.id);

  if (updateError) {
    return deny(`Não foi possível atualizar a conta: ${updateError.message}`);
  }

  revalidatePath(ROUTES.settings);
  revalidatePath("/", "layout");

  return {
    data: { fullName, email: user.email ?? null },
    error: null,
  };
}

async function resolveActiveCompanyIdForUser(): Promise<
  | { companyId: string; error: null }
  | { companyId: null; error: string }
> {
  const { companies, error } = await getUserCompanies();
  if (error) {
    return { companyId: null, error };
  }
  if (companies.length === 0) {
    return { companyId: null, error: "Nenhuma empresa vinculada à sessão." };
  }

  const cookieStore = await cookies();
  const preferred =
    parseActiveCompanyMarker(cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value)
      ?.companyId ?? null;
  const companyId = resolveActiveCompanyId(
    companies.map((c) => c.id),
    preferred
  );

  if (!companyId) {
    return { companyId: null, error: "Empresa ativa não encontrada." };
  }

  return { companyId, error: null };
}

export async function getActiveCompanySettingsAction(): Promise<
  Result<ActiveCompanySettings>
> {
  const resolved = await resolveActiveCompanyIdForUser();
  if (resolved.error || !resolved.companyId) {
    return deny(resolved.error ?? "Empresa ativa não encontrada.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return deny("Sessão autenticada ausente.");
  }

  // Confirma membership ativa (getUserCompanies já exclui inactive).
  const belongs = (await getUserCompanies()).companies.some(
    (c) => c.id === resolved.companyId
  );
  if (!belongs) {
    return deny("Você não pertence a esta empresa.");
  }

  const { data, error } = await supabase
    .from("companies")
    .select(
      "id, name, legal_name, cnpj, phone, email, street, number, complement, neighborhood, city, state, zip_code"
    )
    .eq("id", resolved.companyId)
    .maybeSingle();

  if (error) {
    return deny(`Não foi possível carregar a empresa: ${error.message}`);
  }
  if (!data) {
    return deny("Empresa não encontrada.");
  }

  const row = data as {
    id: string;
    name: string;
    legal_name: string | null;
    cnpj: string | null;
    phone: string | null;
    email: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
  };

  return {
    data: {
      id: row.id,
      name: row.name,
      legalName: row.legal_name,
      cnpj: row.cnpj,
      phone: row.phone,
      email: row.email,
      street: row.street,
      number: row.number,
      complement: row.complement,
      neighborhood: row.neighborhood,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
    },
    error: null,
  };
}

/** Campos cadastrais permitidos ao tenant (nunca plan/status). */
export type CompanySettingsUpdateInput = {
  companyId: string;
  name: string;
  legalName?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  responsibleName?: string | null;
  notes?: string | null;
  stateRegistration?: string | null;
  municipalRegistration?: string | null;
  taxRegime?: string | null;
  logoUrl?: string | null;
};

function buildSafeCompanyPayload(
  input: CompanySettingsUpdateInput
): CompanyUpdate {
  return {
    name: input.name.trim(),
    legal_name: input.legalName?.trim() || null,
    cnpj: input.cnpj?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    street: input.street?.trim() || null,
    number: input.number?.trim() || null,
    complement: input.complement?.trim() || null,
    neighborhood: input.neighborhood?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    zip_code: input.zipCode?.trim() || null,
    country: input.country?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    website: input.website?.trim() || null,
    responsible_name: input.responsibleName?.trim() || null,
    notes: input.notes?.trim() || null,
    state_registration: input.stateRegistration?.trim() || null,
    municipal_registration: input.municipalRegistration?.trim() || null,
    tax_regime: input.taxRegime?.trim() || null,
    logo_url: input.logoUrl?.trim() || null,
  };
}

/**
 * Atualização cadastral da empresa — exige settings.edit.
 * Usado por Settings e /companies.
 */
export async function updateCompanySettingsAction(
  input: CompanySettingsUpdateInput
): Promise<Result<Company>> {
  const companyId =
    typeof input.companyId === "string" ? input.companyId.trim() : "";
  if (!companyId) {
    return deny("Empresa obrigatória.");
  }

  const name = input.name?.trim() ?? "";
  if (!name) {
    return deny("Informe o nome da empresa.");
  }

  const authz = await assertMemberPermission({
    companyId,
    module: PERMISSION_MODULES.settings,
    action: "edit",
  });
  if (!authz.ok) {
    return deny(authz.message);
  }

  // Garante que a empresa do payload é a ativa (ou ao menos membership válida já coberta).
  const resolved = await resolveActiveCompanyIdForUser();
  if (resolved.error || !resolved.companyId) {
    return deny(resolved.error ?? "Empresa ativa não encontrada.");
  }
  if (resolved.companyId !== companyId) {
    return deny(
      "A empresa informada não corresponde à empresa ativa da sessão."
    );
  }

  const supabase = await createClient();
  const payload = buildSafeCompanyPayload({ ...input, name });

  const { data, error } = await supabase
    .from("companies")
    .update(payload as never)
    .eq("id", companyId)
    .select("*")
    .single();

  if (error) {
    return deny(`Não foi possível atualizar a empresa: ${error.message}`);
  }

  revalidatePath(ROUTES.settings);
  revalidatePath(ROUTES.companies);
  revalidatePath("/", "layout");

  return { data: data as Company, error: null };
}
