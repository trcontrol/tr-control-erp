"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import { formatCurrency, toNumberAmount } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";
import type { ExecutiveDashboard } from "@/types/database";

type ExecutiveStockSummaryProps = {
  kpis: ExecutiveDashboard["kpis"];
};

export function ExecutiveStockSummary({ kpis }: ExecutiveStockSummaryProps) {
  const tracked = toNumberAmount(kpis.tracked_products_count);
  const lowStock = toNumberAmount(kpis.low_stock_count);
  const stockValue = toNumberAmount(kpis.stock_value);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Resumo de estoque</CardTitle>
          <CardDescription>
            Produtos ativos com controle de estoque
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.stock}>Estoque</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-[var(--brand-navy)]/[0.03] p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
              Valor em estoque
            </div>
            <p className="mt-2 text-lg font-semibold text-[var(--brand-navy)]">
              {formatCurrency(stockValue)}
            </p>
          </div>

          <div className="rounded-lg border bg-[var(--brand-navy)]/[0.03] p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Boxes className="h-3.5 w-3.5 text-[var(--brand-navy)]" />
              Itens controlados
            </div>
            <p className="mt-2 text-lg font-semibold text-[var(--brand-navy)]">
              {tracked.toLocaleString("pt-BR")}
            </p>
          </div>

          <div
            className={cn(
              "rounded-lg border p-3",
              lowStock > 0
                ? "border-[var(--brand-coral)]/30 bg-[var(--brand-coral)]/10"
                : "bg-[var(--brand-navy)]/[0.03]"
            )}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle
                className={cn(
                  "h-3.5 w-3.5",
                  lowStock > 0
                    ? "text-[var(--brand-coral)]"
                    : "text-muted-foreground"
                )}
              />
              Abaixo do mínimo
            </div>
            <p
              className={cn(
                "mt-2 text-lg font-semibold",
                lowStock > 0
                  ? "text-[var(--brand-coral)]"
                  : "text-[var(--brand-navy)]"
              )}
            >
              {lowStock.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        {tracked === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum produto ativo com controle de estoque cadastrado.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
