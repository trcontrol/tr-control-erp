"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Eye,
  Loader2,
  Package,
  PackageMinus,
  Wallet,
  Warehouse,
} from "lucide-react";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { StockReportChart } from "@/components/reports/stock-report-chart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ROUTES, stockProductHistoryPath } from "@/lib/constants";
import { formatStockQuantity } from "@/lib/products/format";
import {
  formatCurrency,
  formatDateBR,
  isDailySeries,
  STOCK_REPORT_SITUATION_OPTIONS,
  STOCK_REPORT_SITUATIONS,
  type StockLowBalancePoint,
  type StockReportKpis,
  type StockReportRow,
  type StockReportSeriesPoint,
} from "@/lib/reports/format";
import type { Product } from "@/types/database";
import { cn } from "@/lib/utils";

type StockReportPanelProps = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  productId: string;
  category: string;
  situation: string;
  products: Product[];
  categories: string[];
  rows: StockReportRow[];
  kpis: StockReportKpis | null;
  series: StockReportSeriesPoint[];
  lowBalanceSeries: StockLowBalancePoint[];
  loading: boolean;
  error: string | null;
  onProductChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSituationChange: (value: string) => void;
};

export function StockReportPanel({
  companyName,
  periodFrom,
  periodTo,
  productId,
  category,
  situation,
  products,
  categories,
  rows,
  kpis,
  series,
  lowBalanceSeries,
  loading,
  error,
  onProductChange,
  onCategoryChange,
  onSituationChange,
}: StockReportPanelProps) {
  const daily = isDailySeries(periodFrom, periodTo);
  const showCategoryFilter = categories.length > 0;

  const filterCols = showCategoryFilter ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div className="space-y-6">
      <Card className="shadow-card print:shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[var(--brand-navy)]">
            Filtros do relatório
          </CardTitle>
          <CardDescription>
            Refine por produto
            {showCategoryFilter ? ", categoria" : ""} e situação. O período do
            topo aplica-se às movimentações; a posição de estoque reflete o
            saldo atual da empresa ativa.
          </CardDescription>
        </CardHeader>
        <CardContent className={cn("grid gap-4", filterCols)}>
          <div className="space-y-2">
            <Label htmlFor="report-stock-product">Produto</Label>
            <Select
              id="report-stock-product"
              value={productId}
              onChange={(e) => onProductChange(e.target.value)}
            >
              <option value="all">Todos os produtos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </div>
          {showCategoryFilter ? (
            <div className="space-y-2">
              <Label htmlFor="report-stock-category">Categoria</Label>
              <Select
                id="report-stock-category"
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
              >
                <option value="all">Todas as categorias</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="report-stock-situation">Situação</Label>
            <Select
              id="report-stock-situation"
              value={situation}
              onChange={(e) => onSituationChange(e.target.value)}
            >
              {STOCK_REPORT_SITUATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando relatório de estoque...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardKpiCard
              title="Valor total em estoque"
              value={formatCurrency(kpis?.totalStockValue ?? 0)}
              hint="Saldo atual × custo médio"
              icon={Wallet}
              accent="navy"
            />
            <DashboardKpiCard
              title="Itens controlados"
              value={formatStockQuantity(kpis?.totalControlledQuantity ?? 0)}
              hint="Soma das quantidades em estoque"
              icon={Boxes}
              accent="teal"
            />
            <DashboardKpiCard
              title="Com estoque disponível"
              value={String(kpis?.availableProductsCount ?? 0)}
              hint="Produtos com saldo maior que zero"
              icon={Package}
              accent="emerald"
            />
            <DashboardKpiCard
              title="Abaixo do mínimo"
              value={String(kpis?.belowMinProductsCount ?? 0)}
              hint="Saldo atual menor que o mínimo"
              icon={AlertTriangle}
              accent="gold"
            />
            <DashboardKpiCard
              title="Sem estoque"
              value={String(kpis?.outOfStockProductsCount ?? 0)}
              hint="Produtos com saldo zerado"
              icon={PackageMinus}
              accent="coral"
            />
            <DashboardKpiCard
              title="Entradas no período"
              value={formatStockQuantity(kpis?.entriesInPeriod ?? 0)}
              hint={`${formatDateBR(periodFrom)} a ${formatDateBR(periodTo)}`}
              icon={ArrowDownRight}
              accent="emerald"
            />
            <DashboardKpiCard
              title="Saídas no período"
              value={formatStockQuantity(kpis?.exitsInPeriod ?? 0)}
              hint={`${formatDateBR(periodFrom)} a ${formatDateBR(periodTo)}`}
              icon={ArrowUpRight}
              accent="coral"
            />
          </div>

          <Card className="shadow-card print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[var(--brand-navy)]">
                Movimentação de estoque
              </CardTitle>
              <CardDescription>
                {daily
                  ? "Agregação diária por data de movimentação"
                  : "Agregação mensal por data de movimentação"}
                {" · "}
                entradas, saídas e saldo do período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StockReportChart
                series={series}
                lowBalanceSeries={lowBalanceSeries}
                daily={daily}
                entriesInPeriod={kpis?.entriesInPeriod}
                exitsInPeriod={kpis?.exitsInPeriod}
              />
            </CardContent>
          </Card>

          {rows.length === 0 ? (
            <Card className="shadow-card border-dashed">
              <CardHeader className="items-center text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-coral)]/15 ring-1 ring-inset ring-[var(--brand-coral)]/25">
                  <Warehouse className="h-6 w-6 text-[var(--brand-coral)]" />
                </div>
                <CardTitle className="text-[var(--brand-navy)]">
                  Nenhum produto no estoque
                </CardTitle>
                <CardDescription>
                  Não há produtos controlados para {companyName} com os filtros
                  atuais. Ajuste produto
                  {showCategoryFilter ? ", categoria" : ""} ou situação.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center gap-2 pb-6 print:hidden">
                <Button asChild variant="outline">
                  <Link href={ROUTES.stock}>Ir para Estoque</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={ROUTES.products}>Ir para Produtos</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-[var(--brand-navy)]/8 bg-white shadow-card md:block print:block print:shadow-none">
                <div className="border-b border-[var(--brand-navy)]/6 bg-[var(--brand-surface-soft)]/70 px-4 py-3">
                  <h3 className="text-sm font-semibold text-[var(--brand-navy)]">
                    Detalhamento
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {rows.length} produto{rows.length === 1 ? "" : "s"} · posição
                    atual
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Produto</th>
                        <th className="px-4 py-3 font-medium">Categoria</th>
                        <th className="px-4 py-3 font-medium">Código / SKU</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Estoque atual
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Mínimo
                        </th>
                        <th className="px-4 py-3 font-medium">Situação</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Custo médio
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Valor em estoque
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Última movimentação
                        </th>
                        <th className="px-4 py-3 font-medium text-right print:hidden">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.product.id}
                          className="border-t border-border/70"
                        >
                          <td className="px-4 py-3 font-medium text-[var(--brand-navy)]">
                            {row.product.name}
                          </td>
                          <td className="px-4 py-3">
                            {row.product.category || "—"}
                          </td>
                          <td className="px-4 py-3">{row.codeLabel}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatStockQuantity(
                              row.product.current_stock,
                              row.product.unit
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatStockQuantity(
                              row.product.min_stock,
                              row.product.unit
                            )}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3",
                              row.situation ===
                                STOCK_REPORT_SITUATIONS.out_of_stock &&
                                "text-destructive",
                              row.situation ===
                                STOCK_REPORT_SITUATIONS.below_min &&
                                "text-[var(--brand-gold)]"
                            )}
                          >
                            {row.situationLabel}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(row.product.cost_price)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--brand-navy)]">
                            {formatCurrency(row.stockValue)}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {row.lastMovementDate
                              ? formatDateBR(row.lastMovementDate)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 print:hidden">
                            <div className="flex justify-end">
                              <Button asChild variant="ghost" size="icon">
                                <Link
                                  href={stockProductHistoryPath(row.product.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 md:hidden print:hidden">
                {rows.map((row) => (
                  <Card key={row.product.id} className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {row.product.name}
                      </CardTitle>
                      <CardDescription>
                        {row.codeLabel} ·{" "}
                        <span
                          className={
                            row.situation ===
                            STOCK_REPORT_SITUATIONS.out_of_stock
                              ? "text-destructive"
                              : undefined
                          }
                        >
                          {row.situationLabel}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categoria</span>
                        <span>{row.product.category || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Estoque atual
                        </span>
                        <span className="tabular-nums">
                          {formatStockQuantity(
                            row.product.current_stock,
                            row.product.unit
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mínimo</span>
                        <span className="tabular-nums">
                          {formatStockQuantity(
                            row.product.min_stock,
                            row.product.unit
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Custo médio
                        </span>
                        <span className="tabular-nums">
                          {formatCurrency(row.product.cost_price)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Valor em estoque
                        </span>
                        <span className="font-semibold text-[var(--brand-navy)]">
                          {formatCurrency(row.stockValue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Última movimentação
                        </span>
                        <span>
                          {row.lastMovementDate
                            ? formatDateBR(row.lastMovementDate)
                            : "—"}
                        </span>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={stockProductHistoryPath(row.product.id)}>
                          Ver estoque do produto
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
