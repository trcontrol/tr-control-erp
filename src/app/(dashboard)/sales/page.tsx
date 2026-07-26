import { SalesList } from "@/components/sales/sales-list";

export const metadata = {
  title: "Vendas",
};

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendas</h1>
        <p className="text-muted-foreground">
          Gerencie vendas, estoque e contas a receber da empresa ativa
        </p>
      </div>
      <SalesList />
    </div>
  );
}
