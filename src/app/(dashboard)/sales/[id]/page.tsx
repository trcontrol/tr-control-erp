"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SaleDetail } from "@/components/sales/sale-detail";
import { SalePageShell } from "@/components/sales/sale-page-shell";
import { getSale, type SaleWithRelations } from "@/lib/sales/actions";
import { useTenant } from "@/providers/tenant-provider";

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const { company } = useTenant();
  const [sale, setSale] = useState<SaleWithRelations | null>(null);
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

      const result = await getSale(company!.id, params.id);

      if (!active) return;

      if (result.error || !result.data) {
        setSale(null);
        setError(result.error?.message ?? "Venda não encontrada.");
        setLoading(false);
        return;
      }

      setSale(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [company, params.id]);

  return (
    <SalePageShell
      title="Detalhes da venda"
      description="Visualização, confirmação e cancelamento"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando venda...
        </div>
      ) : error || !sale || !company ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? "Venda não encontrada."}
        </div>
      ) : (
        <SaleDetail sale={sale} companyId={company.id} />
      )}
    </SalePageShell>
  );
}
