"use client";

import { PurchaseForm } from "@/components/purchases/purchase-form";
import { PurchasePageShell } from "@/components/purchases/purchase-page-shell";

export function NewPurchaseView() {
  return (
    <PurchasePageShell
      title="Nova compra"
      description="Cadastre um rascunho de compra vinculado à empresa ativa"
    >
      <PurchaseForm mode="create" />
    </PurchasePageShell>
  );
}
