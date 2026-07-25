"use client";

import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerPageShell } from "@/components/customers/customer-page-shell";

export function NewCustomerView() {
  return (
    <CustomerPageShell
      title="Novo cliente"
      description="Cadastre um cliente vinculado à empresa ativa"
    >
      {(companyId) => <CustomerForm companyId={companyId} mode="create" />}
    </CustomerPageShell>
  );
}
