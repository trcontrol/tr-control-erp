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
        <DashboardSectionLink href={ROUTES.stock}>
          Ver estoque
        </DashboardSectionLink>
      }
    >
      <div className="@container/stock space-y-5">
        <div className="grid auto-rows-fr grid-cols-1 gap-3 @[20rem]:grid-cols-2 @[32rem]:grid-cols-3">
          <div className="flex h-full min-w-0 flex-col rounded-2xl border border-[var(--brand-navy)]/[0.04] bg-[var(--brand-surface)]/80 px-4 py-4">
            <div className="flex items-start gap-2.5 text-[12px] font-medium leading-snug text-muted-foreground">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-gold)]/15">
                <Package className="h-3.5 w-3.5 text-[var(--brand-gold)]" />
              </span>
              <span>Valor em estoque</span>
            </div>
            <p className="mt-3 whitespace-nowrap text-[16px] font-bold leading-none tabular-nums text-[var(--brand-navy)]">
              {formatCurrency(stockValue)}
            </p>
          </div>

          <div className="flex h-full min-w-0 flex-col rounded-2xl border border-[var(--brand-navy)]/[0.04] bg-[var(--brand-surface)]/80 px-4 py-4">
            <div className="flex items-start gap-2.5 text-[12px] font-medium leading-snug text-muted-foreground">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-navy)]/8">
                <Boxes className="h-3.5 w-3.5 text-[var(--brand-navy)]" />
              </span>
              <span>Itens controlados</span>
            </div>
            <p className="mt-3 whitespace-nowrap text-[16px] font-bold leading-none tabular-nums text-[var(--brand-navy)]">
              {tracked.toLocaleString("pt-BR")}
            </p>
          </div>

          <div
            className={cn(
              "flex h-full min-w-0 flex-col rounded-2xl border px-4 py-4",
              lowStock > 0
                ? "border-[var(--brand-coral)]/20 bg-[var(--brand-coral)]/[0.07]"
                : "border-[var(--brand-navy)]/[0.04] bg-[var(--brand-surface)]/80",
              "@[20rem]:col-span-2 @[32rem]:col-span-1"
            )}
          >
            <div className="flex items-start gap-2.5 text-[12px] font-medium leading-snug text-muted-foreground">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  lowStock > 0
                    ? "bg-[var(--brand-coral)]/15"
                    : "bg-[var(--brand-navy)]/8"
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
              <span>Abaixo do mínimo</span>
            </div>
            <p
              className={cn(
                "mt-3 whitespace-nowrap text-[16px] font-bold leading-none tabular-nums",
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
            Nenhum produto com estoque controlado.
          </p>
        ) : null}

        {preview.length > 0 ? (
          <div className="space-y-2.5">
            <p className="text-[12px] font-semibold text-[var(--brand-navy)]/60">
              Atenção
            </p>
            {preview.map((product) => (
              <Link
                key={product.id}
                href={productDetailPath(product.id)}
                className="block rounded-xl border border-[var(--brand-navy)]/[0.04] bg-white px-3.5 py-3 transition-colors hover:bg-[var(--brand-navy)]/[0.02]"
              >
                <p className="truncate text-sm font-semibold text-[var(--brand-navy)]">
                  {product.name}
                </p>
                <p className="mt-1 text-[12px] text-[var(--brand-coral)]">
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
