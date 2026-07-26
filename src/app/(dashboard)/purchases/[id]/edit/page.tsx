"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { PurchasePageShell } from "@/components/purchases/purchase-page-shell";
import { PURCHASE_STATUS, purchaseDetailPath } from "@/lib/constants";
import {
  getPurchase,
  type PurchaseWithRelations,
} from "@/lib/purchases/actions";
import { useTenant } from "@/providers/tenant-provider";

export default function PurchaseEditPage() {
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

      if (result.data.status !== PURCHASE_STATUS.draft) {
        setPurchase(result.data);
        setError("Somente compras em rascunho podem ser editadas.");
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
      title="Editar compra"
      description="Atualize o rascunho antes da confirmação"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando compra...
        </div>
      ) : error || !purchase || !company ? (
        <div className="space-y-3">
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error ?? "Compra não encontrada."}
          </div>
          {purchase ? (
            <Button asChild variant="outline">
              <Link href={purchaseDetailPath(purchase.id)}>
                Voltar para detalhes
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <PurchaseForm mode="edit" purchase={purchase} />
      )}
    </PurchasePageShell>
  );
}
