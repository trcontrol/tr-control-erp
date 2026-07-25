"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  Loader2,
  Package,
  Plus,
  SlidersHorizontal,
  Warehouse,
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
  stockMovementDetailPath,
  stockProductHistoryPath,
} from "@/lib/constants";
import {
  getStockDashboard,
  type StockDashboardData,
} from "@/lib/stock/actions";
import {
  formatCurrency,
  formatDateBR,
  formatStockQuantity,
  movementTypeTone,
  stockMovementTypeLabel,
} from "@/lib/stock/format";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";

const quickActions = [
  {
    href: ROUTES.stockEntry,
    label: "Nova entrada",
    icon: ArrowDownLeft,
  },
  {
    href: ROUTES.stockExit,
    label: "Nova saída",
    icon: ArrowUpRight,
  },
  {
    href: ROUTES.stockAdjustment,
    label: "Ajuste manual",
    icon: SlidersHorizontal,
  },
  {
    href: ROUTES.stockInventory,
    label: "Inventário",
    icon: ClipboardList,
  },
];

export function StockDashboard() {
  const { company } = useTenant();
  const [data, setData] = useState<StockDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!company?.id) {
      setData(null);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar o estoque.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getStockDashboard(company.id);

    if (result.error) {
      setData(null);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setData(result.data);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando dashboard de estoque...
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

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button key={action.href} asChild variant="outline">
              <Link href={action.href}>
                <Icon className="h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          );
        })}
        <Button asChild>
          <Link href={ROUTES.stockMovements}>
            <Warehouse className="h-4 w-4" />
            Ver movimentações
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Valor total do estoque</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(data?.totalStockValue ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Soma do custo × saldo dos itens controlados
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Abaixo do mínimo</CardDescription>
            <CardTitle className="text-2xl">
              {data?.lowStockProducts.length ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {data?.trackedProductsCount ?? 0} produtos com controle ativo
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Entradas do dia</CardDescription>
            <CardTitle className="text-2xl text-emerald-700">
              {data?.entriesToday ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Quantidade total de entradas hoje
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saídas do dia</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {data?.exitsToday ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Quantidade total de saídas hoje
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Produtos abaixo do mínimo</CardTitle>
              <CardDescription>
                Itens que precisam de reposição
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.products}>
                <Plus className="h-4 w-4" />
                Produtos
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!data?.lowStockProducts.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhum produto abaixo do estoque mínimo.
              </p>
            ) : (
              <div className="space-y-3">
                {data.lowStockProducts.slice(0, 8).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <Link
                        href={productDetailPath(product.id)}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-xs text-destructive">
                        Atual:{" "}
                        {formatStockQuantity(
                          product.current_stock,
                          product.unit
                        )}{" "}
                        · Mínimo:{" "}
                        {formatStockQuantity(product.min_stock, product.unit)}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={stockProductHistoryPath(product.id)}>
                        Histórico
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Últimas movimentações</CardTitle>
              <CardDescription>Histórico recente da empresa</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.stockMovements}>Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!data?.recentMovements.length ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <Package className="h-8 w-8" />
                Nenhuma movimentação registrada ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentMovements.map((movement) => (
                  <Link
                    key={movement.id}
                    href={stockMovementDetailPath(movement.id)}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                  >
                    <div>
                      <div className="font-medium">
                        {movement.product?.name ?? "Produto"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDateBR(movement.movement_date)} ·{" "}
                        <span
                          className={cn(
                            movementTypeTone(movement.movement_type)
                          )}
                        >
                          {stockMovementTypeLabel(movement.movement_type)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm font-medium">
                      {formatStockQuantity(
                        movement.quantity,
                        movement.product?.unit
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {data?.lowStockProducts.length ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Há {data.lowStockProducts.length} produto(s) abaixo do estoque
            mínimo. Considere registrar entradas ou revisar os mínimos.
          </p>
        </div>
      ) : null}
    </div>
  );
}
