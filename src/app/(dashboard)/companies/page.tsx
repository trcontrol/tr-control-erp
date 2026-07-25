import { CompaniesView } from "@/components/companies/companies-view";
import { getUserCompanies } from "@/lib/auth/session";

export const metadata = {
  title: "Empresas",
};

export default async function CompaniesPage() {
  const { companies, error, debug } = await getUserCompanies();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
        <p className="text-muted-foreground">
          Cadastre e atualize os dados da empresa ativa
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Erro temporário da consulta de empresas</p>
          <p className="mt-1">{error}</p>
          <pre className="mt-3 overflow-x-auto rounded bg-background/60 p-3 text-xs text-foreground">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </div>
      ) : null}

      <CompaniesView companies={companies} loadError={error} />
    </div>
  );
}
