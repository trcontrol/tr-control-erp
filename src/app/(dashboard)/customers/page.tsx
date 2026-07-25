import { CustomersList } from "@/components/customers/customers-list";

export const metadata = {
  title: "Clientes",
};

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Cadastre e gerencie os clientes da empresa ativa
        </p>
      </div>
      <CustomersList />
    </div>
  );
}
