import { StockDashboard } from "@/components/stock/stock-dashboard";

export const metadata = {
  title: "Estoque",
};

export default function StockPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">
          Controle profissional de entradas, saídas, ajustes e inventário
        </p>
      </div>
      <StockDashboard />
    </div>
  );
}
