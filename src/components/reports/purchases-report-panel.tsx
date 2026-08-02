"use client";

import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  Eye,
  FileX2,
  Loader2,
  Receipt,
  ShoppingCart,
  Ticket,
  FilePenLine,
} from "lucide-react";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { PurchasesReportChart } from "@/components/reports/purchases-report-chart";
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
import {
  PURCHASE_STATUS_OPTIONS,
  ROUTES,
  purchaseDetailPath,
} from "@/lib/constants";
import type { PurchaseListItem } from "@/lib/purchases/actions";
import type { Supplier } from "@/types/database";
import {
  formatCurrency,
  formatDateBR,
  isDailySeries,
  purchaseStatusLabel,
  supplierLabel,
  type PurchasesReportKpis,
  type PurchasesReportSeriesPoint,
} from "@/lib/reports/format";

type PurchasesReportPanelProps = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  status: string;
  supplierId: string;
  suppliers: Supplier[];
  purchases: PurchaseListItem[];
  kpis: PurchasesReportKpis | null;
  series: PurchasesReportSeriesPoint[];
  loading: boolean;
  error: string | null;
  onStatusChange: (value: string) => void;
  onSupplierChange: (value: string) => void;
};

export function PurchasesReportPanel({
  companyName,
  periodFrom,
  periodTo,
  status,
  supplierId,
  suppliers,
  purchases,
  kpis,
  series,
  loading,
  error,
  onStatusChange,
  onSupplierChange,
}: PurchasesReportPanelProps) {
  const daily = isDailySeries(periodFrom, periodTo);

  return (
    <div className="space-y-6">
      <Card className="shadow-card print:shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[var(--brand-navy)]">
            Filtros do relatório
          </CardTitle>
          <CardDescription>
            Refine por status e fornecedor. O período e a empresa ativa são
            controlados no topo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="purchases-report-status">Status</Label>
            <Select
              id="purchases-report-status"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="all">Todos os status</option>
              {PURCHASE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchases-report-supplier">Fornecedor</Label>
            <Select
              id="purchases-report-supplier"
              value={supplierId}
              onChange={(e) => onSupplierChange(e.target.value)}
            >
              <option value="all">Todos os fornecedores</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.trade_name || supplier.full_name}
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
            Carregando relatório de compras...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DashboardKpiCard
              title="Total comprado"
              value={formatCurrency(kpis?.totalAmount ?? 0)}
              hint={`${kpis?.purchasesCount ?? 0} compra${(kpis?.purchasesCount ?? 0) === 1 ? "" : "s"} no filtro`}
              icon={Banknote}
              accent="navy"
            />
            <DashboardKpiCard
              title="Quantidade"
              value={String(kpis?.purchasesCount ?? 0)}
              hint="Compras no período filtrado"
              icon={Receipt}
              accent="coral"
            />
            <DashboardKpiCard
              title="Ticket médio"
              value={formatCurrency(kpis?.averageTicket ?? 0)}
              hint="Média sobre as compras filtradas"
              icon={Ticket}
              accent="gold"
            />
            <DashboardKpiCard
              title="Confirmadas"
              value={formatCurrency(kpis?.confirmedAmount ?? 0)}
              hint={`${kpis?.confirmedCount ?? 0} compra${(kpis?.confirmedCount ?? 0) === 1 ? "" : "s"} confirmada${(kpis?.confirmedCount ?? 0) === 1 ? "" : "s"}`}
              icon={CheckCircle2}
              accent="emerald"
            />
            <DashboardKpiCard
              title="Rascunhos"
              value={String(kpis?.draftCount ?? 0)}
              hint="Aguardando confirmação"
              icon={FilePenLine}
              accent="gold"
            />
            <DashboardKpiCard
              title="Canceladas"
              value={String(kpis?.cancelledCount ?? 0)}
              hint="Excluídas do gráfico"
              icon={FileX2}
              accent="coral"
            />
          </div>

          <Card className="shadow-card print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[var(--brand-navy)]">
                Evolução das compras
              </CardTitle>
              <CardDescription>
                {daily
                  ? "Agregação diária no período selecionado"
                  : "Agregação mensal no período selecionado"}
                {" · "}
                canceladas excluídas do gráfico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PurchasesReportChart
                series={series}
                daily={daily}
                averageTicket={kpis?.averageTicket}
              />
            </CardContent>
          </Card>

          {purchases.length === 0 ? (
            <Card className="shadow-card border-dashed">
              <CardHeader className="items-center text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-gold)]/15 ring-1 ring-inset ring-[var(--brand-gold)]/25">
                  <ShoppingCart className="h-6 w-6 text-[var(--brand-gold)]" />
                </div>
                <CardTitle className="text-[var(--brand-navy)]">
                  Nenhuma compra no período
                </CardTitle>
                <CardDescription>
                  Não há compras para {companyName} com os filtros atuais. Ajuste
                  o período, status ou fornecedor.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-6 print:hidden">
                <Button asChild variant="outline">
                  <Link href={ROUTES.purchases}>Ir para Compras</Link>
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
                    {purchases.length} registro
                    {purchases.length === 1 ? "" : "s"} ·{" "}
                    {formatDateBR(periodFrom)} a {formatDateBR(periodTo)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Data</th>
                        <th className="px-4 py-3 font-medium">Fornecedor</th>
                        <th className="px-4 py-3 font-medium">Documento</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Total
                        </th>
                        <th className="px-4 py-3 font-medium text-right print:hidden">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((purchase) => (
                        <tr
                          key={purchase.id}
                          className="border-t border-border/70"
                        >
                          <td className="px-4 py-3 tabular-nums">
                            {formatDateBR(purchase.purchase_date)}
                          </td>
                          <td className="px-4 py-3">
                            {supplierLabel(purchase.supplier)}
                          </td>
                          <td className="px-4 py-3">
                            {purchase.document_number || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {purchaseStatusLabel(purchase.status)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--brand-navy)]">
                            {formatCurrency(purchase.total_amount)}
                          </td>
                          <td className="px-4 py-3 print:hidden">
                            <div className="flex justify-end">
                              <Button asChild variant="ghost" size="icon">
                                <Link href={purchaseDetailPath(purchase.id)}>
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
                {purchases.map((purchase) => (
                  <Card key={purchase.id} className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {supplierLabel(purchase.supplier)}
                      </CardTitle>
                      <CardDescription>
                        {formatDateBR(purchase.purchase_date)} ·{" "}
                        {purchaseStatusLabel(purchase.status)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Documento</span>
                        <span>{purchase.document_number || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-semibold text-[var(--brand-navy)]">
                          {formatCurrency(purchase.total_amount)}
                        </span>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={purchaseDetailPath(purchase.id)}>
                          Ver detalhes
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
