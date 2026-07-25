"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SupplierDetail } from "@/components/suppliers/supplier-detail";
import { SupplierPageShell } from "@/components/suppliers/supplier-page-shell";
import { getSupplier } from "@/lib/suppliers/actions";
import { useTenant } from "@/providers/tenant-provider";
import type { Supplier } from "@/types/database";

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const { company } = useTenant();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
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

      const result = await getSupplier(company!.id, params.id);

      if (!active) return;

      if (result.error || !result.data) {
        setSupplier(null);
        setError(result.error?.message ?? "Fornecedor não encontrado.");
        setLoading(false);
        return;
      }

      setSupplier(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [company, params.id]);

  return (
    <SupplierPageShell
      title="Detalhes do fornecedor"
      description="Visualização completa do cadastro"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando fornecedor...
        </div>
      ) : error || !supplier || !company ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? "Fornecedor não encontrado."}
        </div>
      ) : (
        <SupplierDetail supplier={supplier} companyId={company.id} />
      )}
    </SupplierPageShell>
  );
}
