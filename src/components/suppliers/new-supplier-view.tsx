"use client";

import { SupplierForm } from "@/components/suppliers/supplier-form";
import { SupplierPageShell } from "@/components/suppliers/supplier-page-shell";

export function NewSupplierView() {
  return (
    <SupplierPageShell
      title="Novo fornecedor"
      description="Cadastre um fornecedor vinculado à empresa ativa"
    >
      <SupplierForm mode="create" />
    </SupplierPageShell>
  );
}
