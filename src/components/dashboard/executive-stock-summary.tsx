"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, Package } from "lucide-react";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { DashboardSectionLink } from "@/components/dashboard/dashboard-section-link";
import {
  productDetailPath,
  ROUTES,
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
  compact?: boolean;
};

export function ExecutiveStockSummary({
  kpis,
  lowStockProducts = [],
  compact = false,
}: ExecutiveStockSummaryProps) {
  const tracked = toNumberAmount(kpis.tracked_products_count);
  const lowStock = toNumberAmount(kpis.low_stock_count);
  const stockValue = toNumberAmount(kpis.stock_value);
  const preview = lowStockProducts.slice(0, compact ? 2 : 3);

  return (
    <DashboardSectionCard
      title="Estoque"
      action={
        <DashboardSectionLink href={ROUTES.stock}>Ver</DashboardSectionLink>
      }
    >
      <div className={cn("space-y-3", compact && "min-h-[280px]")}>
        <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-3")}>
          <div className="rounded-xl bg-[var(--brand-navy)]/[0.03] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Package className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
              Valor
            </div>
            <p className="mt-1.5 text-base font-bold tabular-nums text-[var(--brand-navy)]">
              {formatCurrency(stockValue)}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--brand-navy)]/[0.03] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Boxes className="h-3.5 w-3.5 text-[var(--brand-navy)]" />
              Itens
            </div>
            <p className="mt-1.5 text-base font-bold tabular-nums text-[var(--brand-navy)]">
              {tracked.toLocaleString("pt-BR")}
            </p>
          </div>

          <div
            className={cn(
              "rounded-xl px-3 py-2.5",
              lowStock > 0
                ? "bg-[var(--brand-coral)]/[0.08]"
                : "bg-[var(--brand-navy)]/[0.03]"
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
              Abaixo do mín.
            </div>
            <p
              className={cn(
                "mt-1.5 text-base font-bold tabular-nums",
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
          <p className="text-xs text-muted-foreground">
            Nenhum produto com estoque controlado.
          </p>
        ) : null}

        {preview.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--brand-navy)]/60">
              Atenção
            </p>
            {preview.map((product) => (
              <Link
                key={product.id}
                href={productDetailPath(product.id)}
                className="block rounded-lg px-2 py-2 transition-colors hover:bg-[var(--brand-navy)]/[0.03]"
              >
                <p className="truncate text-sm font-semibold text-[var(--brand-navy)]">
                  {product.name}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--brand-coral)]">
                  {formatStockQuantity(product.current_stock, product.unit)} / mín{" "}
                  {formatStockQuantity(product.min_stock, product.unit)}
                </p>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </DashboardSectionCard>
  );
}
