"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ROUTES,
  productDetailPath,
  stockProductHistoryPath,
} from "@/lib/constants";
import { deleteStockMovement, type StockMovementWithRelations } from "@/lib/stock/actions";
import {
  formatDateBR,
  formatDateTimeBR,
  formatSignedQuantity,
  formatStockQuantity,
  movementTypeTone,
  stockMovementTypeLabel,
} from "@/lib/stock/format";
import { cn } from "@/lib/utils";

type StockMovementDetailProps = {
  movement: StockMovementWithRelations;
  companyId: string;
};

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value || "—"}</p>
    </div>
  );
}

export function StockMovementDetail({
  movement,
  companyId,
}: StockMovementDetailProps) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const result = await deleteStockMovement(companyId, movement.id);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push(ROUTES.stockMovements);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>
              {stockMovementTypeLabel(movement.movement_type)}
            </CardTitle>
            <CardDescription>
              {movement.product?.name ?? "Produto"} ·{" "}
              {formatDateBR(movement.movement_date)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {movement.product_id ? (
              <Button asChild variant="outline">
                <Link href={stockProductHistoryPath(movement.product_id)}>
                  Histórico do produto
                </Link>
              </Button>
            ) : null}
            {!confirmingDelete ? (
              <Button
                variant="destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            ) : (
              <>
                <Button
                  variant="destructive"
                  disabled={loading}
                  onClick={() => void handleDelete()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Confirmar exclusão
                </Button>
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="Produto"
            value={movement.product?.name}
          />
          <div>
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p
              className={cn(
                "font-medium",
                movementTypeTone(movement.movement_type)
              )}
            >
              {stockMovementTypeLabel(movement.movement_type)}
            </p>
          </div>
          <InfoItem
            label="Quantidade"
            value={formatStockQuantity(
              movement.quantity,
              movement.product?.unit
            )}
          />
          <InfoItem
            label="Variação"
            value={formatSignedQuantity(
              movement.quantity_delta,
              movement.product?.unit
            )}
          />
          <InfoItem
            label="Saldo anterior"
            value={formatStockQuantity(
              movement.previous_stock,
              movement.product?.unit
            )}
          />
          <InfoItem
            label="Novo saldo"
            value={formatStockQuantity(
              movement.new_stock,
              movement.product?.unit
            )}
          />
          <InfoItem
            label="Data"
            value={formatDateBR(movement.movement_date)}
          />
          <InfoItem
            label="Usuário responsável"
            value={movement.responsible?.full_name}
          />
          <InfoItem
            label="Registrado em"
            value={formatDateTimeBR(movement.created_at)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">
            {movement.notes || "Nenhuma observação cadastrada."}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={ROUTES.stockMovements}>Voltar para movimentações</Link>
        </Button>
        {movement.product_id ? (
          <Button asChild variant="outline">
            <Link href={productDetailPath(movement.product_id)}>
              Ver produto
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
