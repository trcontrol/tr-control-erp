"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Loader2,
  Scale,
  Wallet,
} from "lucide-react";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { FinanceReportChart } from "@/components/reports/finance-report-chart";
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
  FINANCIAL_ENTRY_TYPE_OPTIONS,
  FINANCIAL_STATUS,
  FINANCIAL_STATUS_OPTIONS,
  ROUTES,
  financeDetailPath,
} from "@/lib/constants";
import type { FinancialEntryWithRelations } from "@/lib/finance/entry-query";
import {
  financeEntryTypeLabel,
  financeStatusLabel,
  formatCurrency,
  formatDateBR,
  isDailySeries,
  type FinanceReportKpis,
  type FinanceReportSeriesPoint,
} from "@/lib/reports/format";
import { cn } from "@/lib/utils";

type FinanceReportPanelProps = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  entryType: string;
  status: string;
  category: string;
  entries: FinancialEntryWithRelations[];
  kpis: FinanceReportKpis | null;
  series: FinanceReportSeriesPoint[];
  loading: boolean;
  error: string | null;
  onEntryTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
};

export function FinanceReportPanel({
  companyName,
  periodFrom,
  periodTo,
  entryType,
  status,
  category,
  entries,
  kpis,
  series,
  loading,
  error,
  onEntryTypeChange,
  onStatusChange,
  onCategoryChange,
}: FinanceReportPanelProps) {
  const daily = isDailySeries(periodFrom, periodTo);

  return (
    <div className="space-y-6">
      <Card className="shadow-card print:shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[var(--brand-navy)]">
            Filtros do relatório
          </CardTitle>
          <CardDescription>
            Refine por tipo, status e categoria. O período usa a data de
            vencimento e a empresa ativa é controlada no topo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="report-finance-type">Tipo de movimentação</Label>
            <Select
              id="report-finance-type"
              value={entryType}
              onChange={(e) => onEntryTypeChange(e.target.value)}
            >
              <option value="all">Todos os tipos</option>
              {FINANCIAL_ENTRY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-finance-status">Status</Label>
            <Select
              id="report-finance-status"
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
          <div className="space-y-2">
            <Label htmlFor="report-finance-category">Categoria</Label>
            <Select
              id="report-finance-category"
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
            Carregando relatório financeiro...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DashboardKpiCard
              title="Total de receitas"
              value={formatCurrency(kpis?.totalReceitas ?? 0)}
              hint="Contas a receber no filtro · cancelados excluídos"
              icon={ArrowUpRight}
              accent="emerald"
            />
            <DashboardKpiCard
              title="Total de despesas"
              value={formatCurrency(kpis?.totalDespesas ?? 0)}
              hint="Contas a pagar no filtro · cancelados excluídos"
              icon={ArrowDownLeft}
              accent="coral"
            />
            <DashboardKpiCard
              title="Saldo do período"
              value={formatCurrency(kpis?.saldoPeriodo ?? 0)}
              hint="Receitas − despesas"
              icon={Scale}
              accent="gold"
              tone={
                (kpis?.saldoPeriodo ?? 0) > 0
                  ? "positive"
                  : (kpis?.saldoPeriodo ?? 0) < 0
                    ? "negative"
                    : "default"
              }
            />
            <DashboardKpiCard
              title="Total a receber"
              value={formatCurrency(kpis?.totalAReceber ?? 0)}
              hint="Pendentes e vencidos a receber"
              icon={Wallet}
              accent="teal"
            />
            <DashboardKpiCard
              title="Total a pagar"
              value={formatCurrency(kpis?.totalAPagar ?? 0)}
              hint="Pendentes e vencidos a pagar"
              icon={Wallet}
              accent="navy"
            />
            <DashboardKpiCard
              title="Total em atraso"
              value={formatCurrency(kpis?.totalEmAtraso ?? 0)}
              hint={`${kpis?.cancelledCount ?? 0} cancelado(s) no detalhamento`}
              icon={AlertTriangle}
              accent="coral"
            />
          </div>

          <Card className="shadow-card print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[var(--brand-navy)]">
                Receitas e despesas
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
              <FinanceReportChart
                series={series}
                daily={daily}
                periodBalance={kpis?.saldoPeriodo}
              />
            </CardContent>
          </Card>

          {entries.length === 0 ? (
            <Card className="shadow-card border-dashed">
              <CardHeader className="items-center text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-coral)]/15 ring-1 ring-inset ring-[var(--brand-coral)]/25">
                  <Wallet className="h-6 w-6 text-[var(--brand-coral)]" />
                </div>
                <CardTitle className="text-[var(--brand-navy)]">
                  Nenhum lançamento no período
                </CardTitle>
                <CardDescription>
                  Não há lançamentos financeiros para {companyName} com os
                  filtros atuais. Ajuste o período, tipo, status ou categoria.
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
                    {entries.length} registro{entries.length === 1 ? "" : "s"} ·{" "}
                    {formatDateBR(periodFrom)} a {formatDateBR(periodTo)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Data</th>
                        <th className="px-4 py-3 font-medium">Descrição</th>
                        <th className="px-4 py-3 font-medium">Categoria</th>
                        <th className="px-4 py-3 font-medium">Tipo</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Vencimento</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Valor
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
                            {formatDateBR(entry.issue_date)}
                          </td>
                          <td className="px-4 py-3">
                            {entry.description || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {entry.category || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {financeEntryTypeLabel(entry.entry_type)}
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
                          <td className="px-4 py-3 tabular-nums">
                            {formatDateBR(entry.due_date)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--brand-navy)]">
                            {formatCurrency(entry.amount)}
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
                        {entry.description || "Lançamento"}
                      </CardTitle>
                      <CardDescription>
                        {formatDateBR(entry.issue_date)} ·{" "}
                        {financeEntryTypeLabel(entry.entry_type)} ·{" "}
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
                        <span className="text-muted-foreground">Categoria</span>
                        <span>{entry.category || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vencimento</span>
                        <span>{formatDateBR(entry.due_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor</span>
                        <span className="font-semibold text-[var(--brand-navy)]">
                          {formatCurrency(entry.amount)}
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
