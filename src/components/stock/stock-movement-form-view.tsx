"use client";

import { useSearchParams } from "next/navigation";
import { StockMovementForm } from "@/components/stock/stock-movement-form";
import { StockPageShell } from "@/components/stock/stock-page-shell";
import {
  STOCK_MOVEMENT_TYPES,
  type StockMovementType,
} from "@/lib/constants";
import { stockMovementTypeLabel } from "@/lib/stock/format";

type StockMovementFormViewProps = {
  movementType: StockMovementType;
};

function descriptionFor(type: StockMovementType) {
  switch (type) {
    case STOCK_MOVEMENT_TYPES.entry:
      return "Registre entradas de mercadoria no estoque";
    case STOCK_MOVEMENT_TYPES.exit:
      return "Registre saídas e baixas de estoque";
    case STOCK_MOVEMENT_TYPES.adjustment:
      return "Ajuste manual de saldo com histórico completo";
    case STOCK_MOVEMENT_TYPES.inventory:
      return "Atualize o estoque com base na contagem física";
    default:
      return "Registre uma movimentação de estoque";
  }
}

export function StockMovementFormView({
  movementType,
}: StockMovementFormViewProps) {
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId") ?? undefined;

  return (
    <StockPageShell
      title={stockMovementTypeLabel(movementType)}
      description={descriptionFor(movementType)}
    >
      <StockMovementForm
        movementType={movementType}
        presetProductId={productId}
      />
    </StockPageShell>
  );
}
