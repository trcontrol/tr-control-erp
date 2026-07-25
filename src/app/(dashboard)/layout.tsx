import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { getSession, getUserCompanies } from "@/lib/auth/session";
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

  const { companies, error, debug } = await getUserCompanies();

  return (
    <TenantProvider companies={companies} loadError={error}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Header userEmail={user.email} />
          {error ? (
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
          ) : null}
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </TenantProvider>
  );
}
