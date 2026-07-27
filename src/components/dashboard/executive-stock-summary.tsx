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
      <div className={cn("space-y-4", compact && "min-h-[280px]")}>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--brand-navy)]/[0.04] bg-[var(--brand-navy)]/[0.025] px-3.5 py-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-gold)]/15">
                <Package className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
              </span>
              Valor
            </div>
            <p className="mt-2.5 text-[15px] font-bold tabular-nums leading-none text-[var(--brand-navy)]">
              {formatCurrency(stockValue)}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--brand-navy)]/[0.04] bg-[var(--brand-navy)]/[0.025] px-3.5 py-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-navy)]/10">
                <Boxes className="h-3.5 w-3.5 text-[var(--brand-navy)]" />
              </span>
              Itens
            </div>
            <p className="mt-2.5 text-[15px] font-bold tabular-nums leading-none text-[var(--brand-navy)]">
              {tracked.toLocaleString("pt-BR")}
            </p>
          </div>

          <div
            className={cn(
              "rounded-2xl border px-3.5 py-3.5",
              lowStock > 0
                ? "border-[var(--brand-coral)]/20 bg-[var(--brand-coral)]/[0.07]"
                : "border-[var(--brand-navy)]/[0.04] bg-[var(--brand-navy)]/[0.025]"
            )}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full",
                  lowStock > 0
                    ? "bg-[var(--brand-coral)]/15"
                    : "bg-[var(--brand-navy)]/10"
                )}
              >
                <AlertTriangle
                  className={cn(
                    "h-3.5 w-3.5",
                    lowStock > 0
                      ? "text-[var(--brand-coral)]"
                      : "text-muted-foreground"
                  )}
                />
              </span>
              Abaixo do mín.
            </div>
            <p
              className={cn(
                "mt-2.5 text-[15px] font-bold tabular-nums leading-none",
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
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-navy)]/55">
              Atenção
            </p>
            {preview.map((product) => (
              <Link
                key={product.id}
                href={productDetailPath(product.id)}
                className="block rounded-xl border border-[var(--brand-navy)]/[0.04] bg-[var(--brand-surface)]/70 px-3 py-2.5 transition-colors hover:bg-[var(--brand-navy)]/[0.03]"
              >
                <p className="truncate text-sm font-semibold text-[var(--brand-navy)]">
                  {product.name}
                </p>
                <p className="mt-1 text-[11px] text-[var(--brand-coral)]">
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
