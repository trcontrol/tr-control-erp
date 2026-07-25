import { SuppliersList } from "@/components/suppliers/suppliers-list";

export const metadata = {
  title: "Fornecedores",
};

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
        <p className="text-muted-foreground">
          Cadastre e gerencie os fornecedores da empresa ativa
        </p>
      </div>
      <SuppliersList />
    </div>
  );
}
