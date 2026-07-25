import { StockMovementsList } from "@/components/stock/stock-movements-list";

export const metadata = {
  title: "Movimentações de estoque",
};

export default function StockMovementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Movimentações</h1>
        <p className="text-muted-foreground">
          Histórico completo das movimentações de estoque da empresa
        </p>
      </div>
      <StockMovementsList />
    </div>
  );
}
