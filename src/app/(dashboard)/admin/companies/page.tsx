import { Shield } from "lucide-react";
import { AdminCompaniesBoard } from "@/components/admin/admin-companies-board";
import { listAllCompaniesForPlatformAdmin } from "@/lib/admin/companies-admin";
import { requirePlatformAdmin } from "@/lib/admin/platform-admin";

export const metadata = {
  title: "Gestão de Empresas",
};

export default async function AdminCompaniesPage() {
  await requirePlatformAdmin();

  const { companies, error } = await listAllCompaniesForPlatformAdmin();

  return (
    <div className="space-y-6" data-testid="admin-companies-page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--brand-coral)]">
            <Shield className="h-3.5 w-3.5" />
            Plataforma TR Control
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestão de Empresas
          </h1>
          <p className="text-muted-foreground">
            Cadastro e operação de tenants do SaaS. Acesso exclusivo ao Super
            Admin da plataforma.
          </p>
        </div>
      </div>

      <AdminCompaniesBoard companies={companies} listError={error} />
    </div>
  );
}
