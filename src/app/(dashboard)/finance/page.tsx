import { FinanceBoard } from "@/components/finance/finance-board";

export const metadata = {
  title: "Financeiro",
};

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">
          Contas a pagar e a receber da empresa ativa
        </p>
      </div>
      <FinanceBoard />
    </div>
  );
}
