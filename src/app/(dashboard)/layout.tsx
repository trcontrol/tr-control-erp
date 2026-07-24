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

  const companies = await getUserCompanies();

  return (
    <TenantProvider companies={companies}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Header userEmail={user.email} />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </TenantProvider>
  );
}
