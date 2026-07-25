"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FinanceForm } from "@/components/finance/finance-form";
import { FinancePageShell } from "@/components/finance/finance-page-shell";
import {
  getFinancialEntry,
  type FinancialEntryWithCustomer,
} from "@/lib/finance/actions";
import { useTenant } from "@/providers/tenant-provider";

export default function EditFinancePage() {
  const params = useParams<{ id: string }>();
  const { company } = useTenant();
  const [entry, setEntry] = useState<FinancialEntryWithCustomer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) {
      setLoading(false);
      setError("Selecione uma empresa ativa.");
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await getFinancialEntry(company!.id, params.id);

      if (!active) return;

      if (result.error || !result.data) {
        setEntry(null);
        setError(result.error?.message ?? "Lançamento não encontrado.");
        setLoading(false);
        return;
      }

      setEntry(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [company, params.id]);

  return (
    <FinancePageShell
      title="Editar lançamento"
      description="Atualize os dados do lançamento financeiro"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando lançamento...
        </div>
      ) : error || !entry ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? "Lançamento não encontrado."}
        </div>
      ) : (
        <FinanceForm mode="edit" entry={entry} />
      )}
    </FinancePageShell>
  );
}
