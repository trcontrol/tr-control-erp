import { createClient } from "@/lib/supabase/server";
import type { CompanyWithMembership } from "@/types";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getUserCompanies(): Promise<CompanyWithMembership[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("company_members")
    .select(
      `
      id,
      role,
      created_at,
      company:companies (
        id,
        name,
        slug,
        plan,
        logo_url,
        created_at,
        updated_at
      )
    `
    )
    .eq("user_id", user.id);

  if (error || !data) return [];

  type MemberRow = {
    id: string;
    role: string;
    created_at: string;
    company: CompanyWithMembership | null;
  };

  return (data as MemberRow[])
    .filter((row): row is MemberRow & { company: CompanyWithMembership } =>
      row.company !== null
    )
    .map((row) => ({
      ...row.company,
      membership: {
        id: row.id,
        company_id: row.company.id,
        user_id: user.id,
        role: row.role,
        created_at: row.created_at,
      },
    }));
}

export async function getActiveCompany(
  companySlug?: string
): Promise<CompanyWithMembership | null> {
  const companies = await getUserCompanies();

  if (companies.length === 0) return null;
  if (!companySlug) return companies[0];

  return companies.find((c) => c.slug === companySlug) ?? companies[0];
}
