"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { StockMovementDetail } from "@/components/stock/stock-movement-detail";
import { StockPageShell } from "@/components/stock/stock-page-shell";
import {
  getStockMovement,
  type StockMovementWithRelations,
} from "@/lib/stock/actions";
import { useTenant } from "@/providers/tenant-provider";

export default function StockMovementDetailPage() {
  const params = useParams<{ id: string }>();
  const { company } = useTenant();
  const [movement, setMovement] =
    useState<StockMovementWithRelations | null>(null);
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

      const result = await getStockMovement(company!.id, params.id);

      if (!active) return;

      if (result.error || !result.data) {
        setMovement(null);
        setError(result.error?.message ?? "Movimentação não encontrada.");
        setLoading(false);
        return;
      }

      setMovement(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [company, params.id]);

  return (
    <StockPageShell
      title="Detalhes da movimentação"
      description="Visualização completa do lançamento de estoque"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando movimentação...
        </div>
      ) : error || !movement || !company ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? "Movimentação não encontrada."}
        </div>
      ) : (
        <StockMovementDetail movement={movement} companyId={company.id} />
      )}
    </StockPageShell>
  );
}
