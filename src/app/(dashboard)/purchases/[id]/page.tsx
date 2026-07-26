"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PurchaseDetail } from "@/components/purchases/purchase-detail";
import { PurchasePageShell } from "@/components/purchases/purchase-page-shell";
import {
  getPurchase,
  type PurchaseWithRelations,
} from "@/lib/purchases/actions";
import { useTenant } from "@/providers/tenant-provider";

export default function PurchaseDetailPage() {
  const params = useParams<{ id: string }>();
  const { company } = useTenant();
  const [purchase, setPurchase] = useState<PurchaseWithRelations | null>(null);
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

      const result = await getPurchase(company!.id, params.id);

      if (!active) return;

      if (result.error || !result.data) {
        setPurchase(null);
        setError(result.error?.message ?? "Compra não encontrada.");
        setLoading(false);
        return;
      }

      setPurchase(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [company, params.id]);

  return (
    <PurchasePageShell
      title="Detalhes da compra"
      description="Visualização, confirmação e cancelamento"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando compra...
        </div>
      ) : error || !purchase || !company ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? "Compra não encontrada."}
        </div>
      ) : (
        <PurchaseDetail purchase={purchase} companyId={company.id} />
      )}
    </PurchasePageShell>
  );
}
