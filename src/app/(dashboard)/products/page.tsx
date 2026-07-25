import { ProductsList } from "@/components/products/products-list";

export const metadata = {
  title: "Produtos",
};

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
        <p className="text-muted-foreground">
          Cadastre e gerencie os produtos da empresa ativa
        </p>
      </div>
      <ProductsList />
    </div>
  );
}
