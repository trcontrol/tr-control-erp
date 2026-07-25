import { Suspense } from "react";
import { NewFinanceView } from "@/components/finance/new-finance-view";

export const metadata = {
  title: "Novo lançamento",
};

export default function NewFinancePage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground">Carregando...</div>
      }
    >
      <NewFinanceView />
    </Suspense>
  );
}
