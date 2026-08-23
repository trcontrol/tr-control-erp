import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession, getUserCompanies } from "@/lib/auth/session";
import {
  ACTIVE_COMPANY_COOKIE,
  parseActiveCompanyMarker,
  resolveActiveCompanyId,
} from "@/lib/auth/active-company";
import { isPlatformAdmin } from "@/lib/admin/platform-admin";
import { resolveMemberAccessSnapshot } from "@/lib/plans/require-module-access";
import { TenantProvider } from "@/providers/tenant-provider";
import { ROUTES } from "@/lib/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect(ROUTES.login);
  }

  const [{ companies, error, debug }, platformAdmin, cookieStore] =
    await Promise.all([
      getUserCompanies(),
      isPlatformAdmin(),
      cookies(),
    ]);

  const preferredCompanyId =
    parseActiveCompanyMarker(
      cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value
    )?.companyId ?? null;

  const initialCompanyId = resolveActiveCompanyId(
    companies.map((company) => company.id),
    preferredCompanyId
  );

  const access = initialCompanyId
    ? await resolveMemberAccessSnapshot(initialCompanyId)
    : null;

  return (
    <TenantProvider
      companies={companies}
      initialCompanyId={initialCompanyId ?? undefined}
      initialEntitledModules={access?.entitledModules ?? []}
      initialAllowedModules={access?.allowedModules ?? []}
      initialCreatableModules={access?.creatableModules ?? []}
      initialEditableModules={access?.editableModules ?? []}
      initialDeletableModules={access?.deletableModules ?? []}
      loadError={error}
    >
      <AppShell
        userEmail={user.email}
        isPlatformAdmin={platformAdmin}
        banner={
          error ? (
            <div className="border-b border-destructive/30 bg-destructive/10 px-6 py-3 text-sm text-destructive">
              <p className="font-medium">Erro ao carregar empresas</p>
              <p className="mt-1">{error}</p>
              <p className="mt-1 text-xs opacity-80">
                debug: userId={debug.userId ?? "null"} | email=
                {debug.userEmail ?? "null"} | members={debug.membersCount} |
                companies={debug.companiesCount} | companyIds=
                {debug.memberCompanyIds.join(", ") || "—"}
              </p>
            </div>
          ) : null
        }
      >
        {children}
      </AppShell>
    </TenantProvider>
  );
}
