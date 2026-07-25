"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  Loader2,
  Package,
  SlidersHorizontal,
} from "lucide-react";
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
  productEditPath,
  stockMovementDetailPath,
} from "@/lib/constants";
import { getProduct } from "@/lib/products/actions";
import {
  listStockMovements,
  type StockMovementWithRelations,
} from "@/lib/stock/actions";
import {
  formatDateBR,
  formatSignedQuantity,
  formatStockQuantity,
  movementTypeTone,
  stockMovementTypeLabel,
} from "@/lib/stock/format";
import { useTenant } from "@/providers/tenant-provider";
import type { Product } from "@/types/database";
import { cn } from "@/lib/utils";

type StockProductHistoryProps = {
  productId: string;
};

export function StockProductHistory({ productId }: StockProductHistoryProps) {
  const { company } = useTenant();
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovementWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!company?.id) {
      setProduct(null);
      setMovements([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar o estoque.");
      return;
    }

    setLoading(true);
    setError(null);

    const [productResult, movementsResult] = await Promise.all([
      getProduct(company.id, productId),
      listStockMovements({
        companyId: company.id,
        productId,
      }),
    ]);

    if (productResult.error) {
      setProduct(null);
      setMovements([]);
      setError(productResult.error.message);
      setLoading(false);
      return;
    }

    if (movementsResult.error) {
      setProduct(productResult.data);
      setMovements([]);
      setError(movementsResult.error.message);
      setLoading(false);
      return;
    }

    setProduct(productResult.data);
    setMovements(movementsResult.data);
    setLoading(false);
  }, [company?.id, productId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa ativa</CardTitle>
          <CardDescription>
            Selecione uma empresa para visualizar o histórico.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando histórico...
        </CardContent>
      </Card>
    );
  }

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Produto não encontrado</CardTitle>
          <CardDescription>{error || "Verifique o vínculo."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={ROUTES.stock}>Voltar ao estoque</Link>
          </Button>
        </CardContent>
      </Card>
    );
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
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>
                Saldo atual:{" "}
                {formatStockQuantity(product.current_stock, product.unit)}
                {product.tracks_stock === false
                  ? " · Este item não controla estoque"
                  : ""}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={productDetailPath(product.id)}>Ver produto</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={productEditPath(product.id)}>Editar</Link>
            </Button>
          </div>
        </CardHeader>
        {product.tracks_stock !== false ? (
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`${ROUTES.stockEntry}?productId=${product.id}`}>
                <ArrowDownLeft className="h-4 w-4" />
                Entrada
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`${ROUTES.stockExit}?productId=${product.id}`}>
                <ArrowUpRight className="h-4 w-4" />
                Saída
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`${ROUTES.stockAdjustment}?productId=${product.id}`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Ajuste
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`${ROUTES.stockInventory}?productId=${product.id}`}
              >
                <ClipboardList className="h-4 w-4" />
                Inventário
              </Link>
            </Button>
          </CardContent>
        ) : null}
      </Card>

      {movements.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sem movimentações</CardTitle>
            <CardDescription>
              Ainda não há histórico de estoque para este produto.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Quantidade</th>
                <th className="px-4 py-3 font-medium">Variação</th>
                <th className="px-4 py-3 font-medium">Saldo</th>
                <th className="px-4 py-3 font-medium">Responsável</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-t">
                  <td className="px-4 py-3">
                    {formatDateBR(movement.movement_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "font-medium",
                        movementTypeTone(movement.movement_type)
                      )}
                    >
                      {stockMovementTypeLabel(movement.movement_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {formatStockQuantity(movement.quantity, product.unit)}
                  </td>
                  <td className="px-4 py-3">
                    {formatSignedQuantity(
                      movement.quantity_delta,
                      product.unit
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatStockQuantity(movement.new_stock, product.unit)}
                  </td>
                  <td className="px-4 py-3">
                    {movement.responsible?.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={stockMovementDetailPath(movement.id)}>
                        Detalhes
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
