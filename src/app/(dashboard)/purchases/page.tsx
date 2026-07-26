import { PurchasesList } from "@/components/purchases/purchases-list";

export const metadata = {
  title: "Compras",
};

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
        <p className="text-muted-foreground">
          Gerencie compras, estoque e contas a pagar da empresa ativa
        </p>
      </div>
      <PurchasesList />
    </div>
  );
}
