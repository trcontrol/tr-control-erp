"use client";

import { SaleForm } from "@/components/sales/sale-form";
import { SalePageShell } from "@/components/sales/sale-page-shell";

export function NewSaleView() {
  return (
    <SalePageShell
      title="Nova venda"
      description="Cadastre um rascunho de venda vinculado à empresa ativa"
    >
      <SaleForm mode="create" />
    </SalePageShell>
  );
}
