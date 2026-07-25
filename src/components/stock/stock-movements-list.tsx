"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Loader2, Plus, Search, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ROUTES,
  STOCK_MOVEMENT_TYPE_OPTIONS,
  stockMovementDetailPath,
  stockProductHistoryPath,
} from "@/lib/constants";
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
import { cn } from "@/lib/utils";

export function StockMovementsList() {
  const { company } = useTenant();
  const [movements, setMovements] = useState<StockMovementWithRelations[]>([]);
  const [search, setSearch] = useState("");
  const [movementType, setMovementType] = useState("all");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMovements = useCallback(async () => {
    if (!company?.id) {
      setMovements([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar o estoque.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listStockMovements({
      companyId: company.id,
      search,
      movementType,
      periodFrom: periodFrom || undefined,
      periodTo: periodTo || undefined,
    });

    if (result.error) {
      setMovements([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setMovements(result.data);
    setLoading(false);
  }, [company?.id, search, movementType, periodFrom, periodTo]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadMovements();
    }, 250);
    return () => clearTimeout(timeout);
  }, [loadMovements]);

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa ativa</CardTitle>
          <CardDescription>
            Selecione ou cadastre uma empresa para gerenciar o estoque.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por produto, código ou observação"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={ROUTES.stockEntry}>
              <Plus className="h-4 w-4" />
              Entrada
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.stockExit}>
              <Plus className="h-4 w-4" />
              Saída
            </Link>
          </Button>
          <Button asChild>
            <Link href={ROUTES.stock}>Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          value={movementType}
          onChange={(e) => setMovementType(e.target.value)}
        >
          <option value="all">Todos os tipos</option>
          {STOCK_MOVEMENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={periodFrom}
          onChange={(e) => setPeriodFrom(e.target.value)}
          aria-label="Data inicial"
        />
        <Input
          type="date"
          value={periodTo}
          onChange={(e) => setPeriodTo(e.target.value)}
          aria-label="Data final"
        />
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando movimentações...
          </CardContent>
        </Card>
      ) : movements.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Warehouse className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Nenhuma movimentação encontrada</CardTitle>
            <CardDescription>
              Registre uma entrada, saída, ajuste ou inventário para começar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-2 pb-6">
            <Button asChild>
              <Link href={ROUTES.stockEntry}>Nova entrada</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={ROUTES.stockExit}>Nova saída</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Produto</th>
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
                      <div className="font-medium">
                        {movement.product?.name ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {movement.product?.internal_code ||
                          movement.product?.sku ||
                          "—"}
                      </div>
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
                      {formatStockQuantity(
                        movement.quantity,
                        movement.product?.unit
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formatSignedQuantity(
                        movement.quantity_delta,
                        movement.product?.unit
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formatStockQuantity(
                        movement.new_stock,
                        movement.product?.unit
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {movement.responsible?.full_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={stockMovementDetailPath(movement.id)}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {movement.product_id ? (
                          <Button asChild variant="ghost" size="sm">
                            <Link
                              href={stockProductHistoryPath(movement.product_id)}
                            >
                              Histórico
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {movements.map((movement) => (
              <Card key={movement.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {movement.product?.name ?? "Produto"}
                  </CardTitle>
                  <CardDescription>
                    {formatDateBR(movement.movement_date)} ·{" "}
                    <span
                      className={cn(movementTypeTone(movement.movement_type))}
                    >
                      {stockMovementTypeLabel(movement.movement_type)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantidade</span>
                    <span className="font-medium">
                      {formatStockQuantity(
                        movement.quantity,
                        movement.product?.unit
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo</span>
                    <span className="font-medium">
                      {formatStockQuantity(
                        movement.new_stock,
                        movement.product?.unit
                      )}
                    </span>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={stockMovementDetailPath(movement.id)}>
                      Ver detalhes
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
