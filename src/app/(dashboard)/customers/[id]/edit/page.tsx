"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerPageShell } from "@/components/customers/customer-page-shell";
import { getCustomer } from "@/lib/customers/actions";
import type { Customer } from "@/types/database";

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();

  return (
    <CustomerPageShell
      title="Editar cliente"
      description="Atualize os dados do cliente da empresa ativa"
    >
      {(companyId) => (
        <CustomerEditLoader companyId={companyId} customerId={params.id} />
      )}
    </CustomerPageShell>
  );
}

function CustomerEditLoader({
  companyId,
  customerId,
}: {
  companyId: string;
  customerId: string;
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await getCustomer(companyId, customerId);

      if (!active) return;

      if (result.error || !result.data) {
        setCustomer(null);
        setError(result.error?.message ?? "Cliente não encontrado.");
        setLoading(false);
        return;
      }

      setCustomer(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [companyId, customerId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando cliente...
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error ?? "Cliente não encontrado."}
      </div>
    );
  }

  return (
    <CustomerForm companyId={companyId} customer={customer} mode="edit" />
  );
}
