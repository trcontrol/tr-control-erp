"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import {
  productDetailPath,
  ROUTES,
  stockProductHistoryPath,
} from "@/lib/constants";
import {
  formatCurrency,
  formatStockQuantity,
  toNumberAmount,
} from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";
import type { ExecutiveDashboard } from "@/types/database";

type ExecutiveStockSummaryProps = {
  kpis: ExecutiveDashboard["kpis"];
  lowStockProducts?: ExecutiveDashboard["low_stock_products"];
};

export function ExecutiveStockSummary({
  kpis,
  lowStockProducts = [],
}: ExecutiveStockSummaryProps) {
  const tracked = toNumberAmount(kpis.tracked_products_count);
  const lowStock = toNumberAmount(kpis.low_stock_count);
  const stockValue = toNumberAmount(kpis.stock_value);
  const preview = lowStockProducts.slice(0, 3);

  return (
    <DashboardSectionCard
      title="Resumo de estoque"
      description="Produtos ativos com controle de estoque"
      action={
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link href={ROUTES.stock}>Estoque</Link>
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--brand-navy)]/8 bg-[var(--brand-navy)]/[0.03] p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Package className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
              Valor em estoque
            </div>
            <p className="mt-1.5 text-base font-semibold text-[var(--brand-navy)]">
              {formatCurrency(stockValue)}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--brand-navy)]/8 bg-[var(--brand-navy)]/[0.03] p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Boxes className="h-3.5 w-3.5 text-[var(--brand-navy)]" />
              Itens controlados
            </div>
            <p className="mt-1.5 text-base font-semibold text-[var(--brand-navy)]">
              {tracked.toLocaleString("pt-BR")}
            </p>
          </div>

          <div
            className={cn(
              "rounded-lg border p-2.5",
              lowStock > 0
                ? "border-[var(--brand-coral)]/30 bg-[var(--brand-coral)]/10"
                : "border-[var(--brand-navy)]/8 bg-[var(--brand-navy)]/[0.03]"
            )}
          >
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
                "mt-1.5 text-base font-semibold",
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

        {preview.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--brand-navy)]">
              Produtos abaixo do mínimo
            </p>
            {preview.map((product) => (
              <div
                key={product.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-[var(--brand-navy)]/8 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <Link
                    href={productDetailPath(product.id)}
                    className="truncate text-sm font-medium text-[var(--brand-navy)] hover:underline"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-[var(--brand-coral)]">
                    Atual:{" "}
                    {formatStockQuantity(product.current_stock, product.unit)} ·
                    Mín: {formatStockQuantity(product.min_stock, product.unit)}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <Link href={stockProductHistoryPath(product.id)}>Histórico</Link>
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </DashboardSectionCard>
  );
}
