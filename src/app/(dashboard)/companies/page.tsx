import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserCompanies } from "@/lib/auth/session";

export const metadata = {
  title: "Empresas",
};

export default async function CompaniesPage() {
  const companies = await getUserCompanies();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
        <p className="text-muted-foreground">
          Gerencie as empresas vinculadas à sua conta
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.length === 0 ? (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Nenhuma empresa encontrada</CardTitle>
              <CardDescription>
                Crie uma empresa ao se cadastrar ou entre em contato com um
                administrador para receber um convite.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          companies.map((company) => (
            <Card key={company.id}>
              <CardHeader>
                <CardTitle>{company.name}</CardTitle>
                <CardDescription>/{company.slug}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Plano</span>
                  <span className="font-medium capitalize">{company.plan}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Seu papel</span>
                  <span className="font-medium capitalize">
                    {company.membership.role}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
