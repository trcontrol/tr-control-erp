import { Suspense } from "react";
import { StockMovementFormView } from "@/components/stock/stock-movement-form-view";
import { STOCK_MOVEMENT_TYPES } from "@/lib/constants";

export const metadata = {
  title: "Ajuste de estoque",
};

export default function StockAdjustmentPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground">Carregando...</div>
      }
    >
      <StockMovementFormView movementType={STOCK_MOVEMENT_TYPES.adjustment} />
    </Suspense>
  );
}
