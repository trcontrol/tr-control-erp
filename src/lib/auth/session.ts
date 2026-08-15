import { createClient } from "@/lib/supabase/server";
import type { Company, CompanyMember } from "@/types/database";
import type { CompanyWithMembership } from "@/types";

export type UserCompaniesResult = {
  companies: CompanyWithMembership[];
  error: string | null;
  debug: {
    userId: string | null;
    userEmail: string | null;
    membersCount: number;
    companiesCount: number;
    memberCompanyIds: string[];
  };
};

function emptyResult(
  error: string | null,
  debug?: Partial<UserCompaniesResult["debug"]>
): UserCompaniesResult {
  return {
    companies: [],
    error,
    debug: {
      userId: null,
      userEmail: null,
      membersCount: 0,
      companiesCount: 0,
      memberCompanyIds: [],
      ...debug,
    },
  };
}

function sortCompaniesDeterministic(
  rows: CompanyWithMembership[]
): CompanyWithMembership[] {
  return [...rows].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, "pt-BR", {
      sensitivity: "base",
    });
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * Carrega empresas do usuário autenticado.
 * Usa duas consultas (members → companies) para evitar falhas silenciosas
 * do embed PostgREST e para respeitar RLS em cada tabela.
 * Ordenação determinística por nome (não define empresa ativa).
 */
export async function getUserCompanies(): Promise<UserCompaniesResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return emptyResult(
      `Falha ao obter sessão autenticada: ${userError.message}`
    );
  }

  if (!user) {
    return emptyResult("Sessão autenticada ausente (auth.getUser retornou null).");
  }

  const {
    data: memberships,
    error: membershipsError,
  } = await supabase
    .from("company_members")
    .select("id, company_id, user_id, role, access_profile, status, created_at")
    .eq("user_id", user.id)
    .neq("status", "inactive")
    .order("created_at", { ascending: true });

  if (membershipsError) {
    return emptyResult(
      `Erro ao consultar company_members: ${membershipsError.message}`,
      {
        userId: user.id,
        userEmail: user.email ?? null,
      }
    );
  }

  const memberRows = (memberships ?? []) as Pick<
    CompanyMember,
    | "id"
    | "company_id"
    | "user_id"
    | "role"
    | "access_profile"
    | "status"
    | "created_at"
  >[];

  const memberCompanyIds = memberRows.map((row) => row.company_id);

  if (memberRows.length === 0) {
    return emptyResult(
      "Nenhum vínculo em company_members para este usuário (user_id = auth.uid()).",
      {
        userId: user.id,
        userEmail: user.email ?? null,
        membersCount: 0,
        memberCompanyIds: [],
      }
    );
  }

  const { data: companiesData, error: companiesError } = await supabase
    .from("companies")
    .select("*")
    .in("id", memberCompanyIds);

  if (companiesError) {
    return emptyResult(
      `Erro ao consultar companies: ${companiesError.message}`,
      {
        userId: user.id,
        userEmail: user.email ?? null,
        membersCount: memberRows.length,
        memberCompanyIds,
      }
    );
  }

  const companies = (companiesData ?? []) as Company[];
  const companiesById = new Map(companies.map((company) => [company.id, company]));

  const result: CompanyWithMembership[] = sortCompaniesDeterministic(
    memberRows
      .map((membership) => {
        const company = companiesById.get(membership.company_id);
        if (!company) return null;

        return {
          ...company,
        membership: {
          id: membership.id,
          company_id: membership.company_id,
          user_id: membership.user_id,
          role: membership.role,
          access_profile: membership.access_profile,
          status: membership.status,
          created_at: membership.created_at,
        },
        };
      })
      .filter((row): row is CompanyWithMembership => row !== null)
  );

  let error: string | null = null;

  if (result.length === 0) {
    error =
      "Vínculos encontrados em company_members, mas nenhuma empresa retornada por companies (possível bloqueio de RLS no SELECT de companies).";
  }

  return {
    companies: result,
    error,
    debug: {
      userId: user.id,
      userEmail: user.email ?? null,
      membersCount: memberRows.length,
      companiesCount: result.length,
      memberCompanyIds,
    },
  };
}

export async function getActiveCompany(
  companySlug?: string
): Promise<CompanyWithMembership | null> {
  const { companies } = await getUserCompanies();

  if (companies.length === 0) return null;
  if (!companySlug) return companies[0];

  return companies.find((c) => c.slug === companySlug) ?? companies[0];
}
