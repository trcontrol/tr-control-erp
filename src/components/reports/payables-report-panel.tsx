"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Clock3,
  Eye,
  HandCoins,
  Hash,
  Loader2,
  Receipt,
} from "lucide-react";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { PayablesReportChart } from "@/components/reports/payables-report-chart";
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
  FINANCIAL_CATEGORIES,
  FINANCIAL_STATUS,
  FINANCIAL_STATUS_OPTIONS,
  ROUTES,
  financeDetailPath,
} from "@/lib/constants";
import type { FinancialEntryWithRelations } from "@/lib/finance/actions";
import {
  financeStatusLabel,
  formatCurrency,
  formatDateBR,
  isDailySeries,
  payablePartyLabel,
  supplierLabel,
  type PayablesReportKpis,
  type PayablesReportSeriesPoint,
} from "@/lib/reports/format";
import type { Supplier } from "@/types/database";
import { cn } from "@/lib/utils";

type PayablesReportPanelProps = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  status: string;
  supplierId: string;
  category: string;
  suppliers: Supplier[];
  entries: FinancialEntryWithRelations[];
  kpis: PayablesReportKpis | null;
  series: PayablesReportSeriesPoint[];
  loading: boolean;
  error: string | null;
  onStatusChange: (value: string) => void;
  onSupplierChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
};

export function PayablesReportPanel({
  companyName,
  periodFrom,
  periodTo,
  status,
  supplierId,
  category,
  suppliers,
  entries,
  kpis,
  series,
  loading,
  error,
  onStatusChange,
  onSupplierChange,
  onCategoryChange,
}: PayablesReportPanelProps) {
  const daily = isDailySeries(periodFrom, periodTo);
  const hasSupplierLinks = entries.some((entry) => Boolean(entry.supplier_id));
  const showSupplierFilter = suppliers.length > 0 || hasSupplierLinks;
  const showCategoryFilter = FINANCIAL_CATEGORIES.length > 0;

  const filterCols =
    showSupplierFilter && showCategoryFilter
      ? "sm:grid-cols-3"
      : showSupplierFilter || showCategoryFilter
        ? "sm:grid-cols-2"
        : "sm:grid-cols-1";

  return (
    <div className="space-y-6">
      <Card className="shadow-card print:shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[var(--brand-navy)]">
            Filtros do relatório
          </CardTitle>
          <CardDescription>
            Refine por status
            {showSupplierFilter ? ", fornecedor" : ""}
            {showCategoryFilter ? " e categoria" : ""}. O período usa a data de
            vencimento e a empresa ativa é controlada no topo.
          </CardDescription>
        </CardHeader>
        <CardContent className={cn("grid gap-4", filterCols)}>
          <div className="space-y-2">
            <Label htmlFor="report-payables-status">Status</Label>
            <Select
              id="report-payables-status"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="all">Todos os status</option>
              {FINANCIAL_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          {showSupplierFilter ? (
            <div className="space-y-2">
              <Label htmlFor="report-payables-supplier">Fornecedor</Label>
              <Select
                id="report-payables-supplier"
                value={supplierId}
                onChange={(e) => onSupplierChange(e.target.value)}
              >
                <option value="all">Todos os fornecedores</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplierLabel(supplier)}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {showCategoryFilter ? (
            <div className="space-y-2">
              <Label htmlFor="report-payables-category">Categoria</Label>
              <Select
                id="report-payables-category"
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
              >
                <option value="all">Todas as categorias</option>
                {FINANCIAL_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
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
            Carregando relatório de contas a pagar...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DashboardKpiCard
              title="Total a pagar no período"
              value={formatCurrency(kpis?.totalAPagar ?? 0)}
              hint="Obrigações não canceladas no filtro"
              icon={HandCoins}
              accent="navy"
            />
            <DashboardKpiCard
              title="Total pago"
              value={formatCurrency(kpis?.totalPago ?? 0)}
              hint="Status pago"
              icon={Banknote}
              accent="emerald"
            />
            <DashboardKpiCard
              title="Total pendente"
              value={formatCurrency(kpis?.totalPendente ?? 0)}
              hint="Aberto e ainda no prazo"
              icon={Clock3}
              accent="coral"
            />
            <DashboardKpiCard
              title="Total em atraso"
              value={formatCurrency(kpis?.totalEmAtraso ?? 0)}
              hint="Vencido, pendente e não cancelado"
              icon={AlertTriangle}
              accent="gold"
            />
            <DashboardKpiCard
              title="Quantidade de títulos"
              value={String(kpis?.entriesCount ?? 0)}
              hint="Lançamentos no detalhamento"
              icon={Hash}
              accent="teal"
            />
            <DashboardKpiCard
              title="Ticket médio"
              value={formatCurrency(kpis?.averageTicket ?? 0)}
              hint="Total a pagar ÷ títulos válidos"
              icon={Receipt}
              accent="sky"
            />
          </div>

          <Card className="shadow-card print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[var(--brand-navy)]">
                Pagamentos por período
              </CardTitle>
              <CardDescription>
                {daily
                  ? "Agregação diária por vencimento"
                  : "Agregação mensal por vencimento"}
                {" · "}
                cancelados excluídos do gráfico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayablesReportChart
                series={series}
                daily={daily}
                totalAPagar={kpis?.totalAPagar}
              />
            </CardContent>
          </Card>

          {entries.length === 0 ? (
            <Card className="shadow-card border-dashed">
              <CardHeader className="items-center text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-coral)]/15 ring-1 ring-inset ring-[var(--brand-coral)]/25">
                  <HandCoins className="h-6 w-6 text-[var(--brand-coral)]" />
                </div>
                <CardTitle className="text-[var(--brand-navy)]">
                  Nenhuma conta a pagar no período
                </CardTitle>
                <CardDescription>
                  Não há títulos a pagar para {companyName} com os filtros
                  atuais. Ajuste o período, status
                  {showSupplierFilter ? ", fornecedor" : ""}
                  {showCategoryFilter ? " ou categoria" : ""}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-6 print:hidden">
                <Button asChild variant="outline">
                  <Link href={ROUTES.finance}>Ir para Financeiro</Link>
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
                    {entries.length} título{entries.length === 1 ? "" : "s"} ·{" "}
                    {formatDateBR(periodFrom)} a {formatDateBR(periodTo)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Vencimento</th>
                        <th className="px-4 py-3 font-medium">Descrição</th>
                        <th className="px-4 py-3 font-medium">Fornecedor</th>
                        <th className="px-4 py-3 font-medium">Categoria</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Valor
                        </th>
                        <th className="px-4 py-3 font-medium">
                          Data de pagamento
                        </th>
                        <th className="px-4 py-3 font-medium text-right print:hidden">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id} className="border-t border-border/70">
                          <td className="px-4 py-3 tabular-nums">
                            {formatDateBR(entry.due_date)}
                          </td>
                          <td className="px-4 py-3">
                            {entry.description || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {payablePartyLabel(entry)}
                          </td>
                          <td className="px-4 py-3">
                            {entry.category || "—"}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3",
                              entry.status === FINANCIAL_STATUS.overdue &&
                                "text-destructive"
                            )}
                          >
                            {financeStatusLabel(entry.status)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--brand-navy)]">
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {entry.payment_date
                              ? formatDateBR(entry.payment_date)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 print:hidden">
                            <div className="flex justify-end">
                              <Button asChild variant="ghost" size="icon">
                                <Link href={financeDetailPath(entry.id)}>
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
                {entries.map((entry) => (
                  <Card key={entry.id} className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {entry.description || "Conta a pagar"}
                      </CardTitle>
                      <CardDescription>
                        Venc. {formatDateBR(entry.due_date)} ·{" "}
                        <span
                          className={
                            entry.status === FINANCIAL_STATUS.overdue
                              ? "text-destructive"
                              : undefined
                          }
                        >
                          {financeStatusLabel(entry.status)}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Fornecedor
                        </span>
                        <span>{payablePartyLabel(entry)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categoria</span>
                        <span>{entry.category || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor</span>
                        <span className="font-semibold text-[var(--brand-navy)]">
                          {formatCurrency(entry.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Pagamento
                        </span>
                        <span>
                          {entry.payment_date
                            ? formatDateBR(entry.payment_date)
                            : "—"}
                        </span>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={financeDetailPath(entry.id)}>
                          Ver lançamento
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
