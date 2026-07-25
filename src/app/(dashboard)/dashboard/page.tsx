import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveCompany } from "@/lib/auth/session";
import { TAX_REGIMES } from "@/lib/constants";

export const metadata = {
  title: "Dashboard",
};

function taxRegimeLabel(value: string | null) {
  if (!value) return "Não informado";
  return TAX_REGIMES.find((item) => item.value === value)?.label ?? value;
}

export default async function DashboardPage() {
  const activeCompany = await getActiveCompany();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao TR Control ERP
          {activeCompany ? ` — ${activeCompany.name}` : ""}
        </p>
      </div>

      {activeCompany ? (
        <Card>
          <CardHeader>
            <CardTitle>Empresa ativa</CardTitle>
            <CardDescription>
              Dados atualizados do cadastro da empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Nome fantasia</p>
              <p className="font-medium">{activeCompany.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Razão social</p>
              <p className="font-medium">
                {activeCompany.legal_name || "Não informada"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CNPJ</p>
              <p className="font-medium">
                {activeCompany.cnpj || "Não informado"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Regime tributário</p>
              <p className="font-medium">
                {taxRegimeLabel(activeCompany.tax_regime)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cidade / UF</p>
              <p className="font-medium">
                {activeCompany.city && activeCompany.state
                  ? `${activeCompany.city} / ${activeCompany.state}`
                  : "Não informado"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="font-medium">
                {activeCompany.phone || "Não informado"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="font-medium">
                {activeCompany.email || "Não informado"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Responsável</p>
              <p className="font-medium">
                {activeCompany.responsible_name || "Não informado"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Receita</CardDescription>
            <CardTitle className="text-2xl">R$ 0,00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Módulo financeiro em breve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pedidos</CardDescription>
            <CardTitle className="text-2xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Módulo de vendas em breve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Produtos</CardDescription>
            <CardTitle className="text-2xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Módulo de estoque em breve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Usuários</CardDescription>
            <CardTitle className="text-2xl">1</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Membros da empresa ativa
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
