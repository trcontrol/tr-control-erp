"use client";

import { useParams } from "next/navigation";
import { StockPageShell } from "@/components/stock/stock-page-shell";
import { StockProductHistory } from "@/components/stock/stock-product-history";

export default function StockProductHistoryPage() {
  const params = useParams<{ productId: string }>();

  return (
    <StockPageShell
      title="Histórico por produto"
      description="Movimentações e saldo do item selecionado"
    >
      <StockProductHistory productId={params.productId} />
    </StockPageShell>
  );
}
