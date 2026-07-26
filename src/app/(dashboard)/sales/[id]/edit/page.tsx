"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaleForm } from "@/components/sales/sale-form";
import { SalePageShell } from "@/components/sales/sale-page-shell";
import { SALE_STATUS, saleDetailPath } from "@/lib/constants";
import { getSale, type SaleWithRelations } from "@/lib/sales/actions";
import { useTenant } from "@/providers/tenant-provider";

export default function EditSalePage() {
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

      if (result.data.status !== SALE_STATUS.draft) {
        setSale(result.data);
        setError("Somente vendas em rascunho podem ser editadas.");
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
      title="Editar venda"
      description="Altere o rascunho antes da confirmação"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando venda...
        </div>
      ) : error || !sale || !company ? (
        <div className="space-y-3">
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error ?? "Venda não encontrada."}
          </div>
          {sale ? (
            <Button asChild variant="outline">
              <Link href={saleDetailPath(sale.id)}>Ver detalhes</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <SaleForm mode="edit" sale={sale} />
      )}
    </SalePageShell>
  );
}
