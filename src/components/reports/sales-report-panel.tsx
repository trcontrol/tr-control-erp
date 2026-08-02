"use client";

import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  Eye,
  Loader2,
  Receipt,
  ShoppingBag,
  Ticket,
} from "lucide-react";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { SalesReportChart } from "@/components/reports/sales-report-chart";
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
  ROUTES,
  SALE_STATUS_OPTIONS,
  saleDetailPath,
} from "@/lib/constants";
import type { SaleListItem } from "@/lib/sales/actions";
import type { Customer } from "@/types/database";
import {
  customerLabel,
  formatCurrency,
  formatDateBR,
  isDailySeries,
  saleStatusLabel,
  type SalesReportKpis,
  type SalesReportSeriesPoint,
} from "@/lib/reports/format";

type SalesReportPanelProps = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  status: string;
  customerId: string;
  customers: Customer[];
  sales: SaleListItem[];
  kpis: SalesReportKpis | null;
  series: SalesReportSeriesPoint[];
  loading: boolean;
  error: string | null;
  onStatusChange: (value: string) => void;
  onCustomerChange: (value: string) => void;
};

export function SalesReportPanel({
  companyName,
  periodFrom,
  periodTo,
  status,
  customerId,
  customers,
  sales,
  kpis,
  series,
  loading,
  error,
  onStatusChange,
  onCustomerChange,
}: SalesReportPanelProps) {
  const daily = isDailySeries(periodFrom, periodTo);

  return (
    <div className="space-y-6">
      <Card className="shadow-card print:shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[var(--brand-navy)]">
            Filtros do relatório
          </CardTitle>
          <CardDescription>
            Refine por status e cliente. O período e a empresa ativa são
            controlados no topo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="report-status">Status</Label>
            <Select
              id="report-status"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="all">Todos os status</option>
              {SALE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-customer">Cliente</Label>
            <Select
              id="report-customer"
              value={customerId}
              onChange={(e) => onCustomerChange(e.target.value)}
            >
              <option value="all">Todos os clientes</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.trade_name || customer.full_name}
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
            Carregando relatório de vendas...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardKpiCard
              title="Total do período"
              value={formatCurrency(kpis?.totalAmount ?? 0)}
              hint={`${kpis?.salesCount ?? 0} venda${(kpis?.salesCount ?? 0) === 1 ? "" : "s"} no filtro`}
              icon={Banknote}
              accent="navy"
            />
            <DashboardKpiCard
              title="Quantidade"
              value={String(kpis?.salesCount ?? 0)}
              hint={`${kpis?.draftCount ?? 0} rascunho(s) · ${kpis?.cancelledCount ?? 0} cancelada(s)`}
              icon={Receipt}
              accent="coral"
            />
            <DashboardKpiCard
              title="Ticket médio"
              value={formatCurrency(kpis?.averageTicket ?? 0)}
              hint="Média sobre as vendas filtradas"
              icon={Ticket}
              accent="gold"
            />
            <DashboardKpiCard
              title="Confirmadas"
              value={formatCurrency(kpis?.confirmedAmount ?? 0)}
              hint={`${kpis?.confirmedCount ?? 0} venda${(kpis?.confirmedCount ?? 0) === 1 ? "" : "s"} confirmada${(kpis?.confirmedCount ?? 0) === 1 ? "" : "s"}`}
              icon={CheckCircle2}
              accent="emerald"
            />
          </div>

          <Card className="shadow-card print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[var(--brand-navy)]">
                Evolução das vendas
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
              <SalesReportChart
                series={series}
                daily={daily}
                averageTicket={kpis?.averageTicket}
              />
            </CardContent>
          </Card>

          {sales.length === 0 ? (
            <Card className="shadow-card border-dashed">
              <CardHeader className="items-center text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-coral)]/15 ring-1 ring-inset ring-[var(--brand-coral)]/25">
                  <ShoppingBag className="h-6 w-6 text-[var(--brand-coral)]" />
                </div>
                <CardTitle className="text-[var(--brand-navy)]">
                  Nenhuma venda no período
                </CardTitle>
                <CardDescription>
                  Não há vendas para {companyName} com os filtros atuais. Ajuste
                  o período, status ou cliente.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-6 print:hidden">
                <Button asChild variant="outline">
                  <Link href={ROUTES.sales}>Ir para Vendas</Link>
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
                    {sales.length} registro{sales.length === 1 ? "" : "s"} ·{" "}
                    {formatDateBR(periodFrom)} a {formatDateBR(periodTo)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Data</th>
                        <th className="px-4 py-3 font-medium">Cliente</th>
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
                      {sales.map((sale) => (
                        <tr key={sale.id} className="border-t border-border/70">
                          <td className="px-4 py-3 tabular-nums">
                            {formatDateBR(sale.sale_date)}
                          </td>
                          <td className="px-4 py-3">
                            {customerLabel(sale.customer)}
                          </td>
                          <td className="px-4 py-3">
                            {sale.document_number || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {saleStatusLabel(sale.status)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--brand-navy)]">
                            {formatCurrency(sale.total_amount)}
                          </td>
                          <td className="px-4 py-3 print:hidden">
                            <div className="flex justify-end">
                              <Button asChild variant="ghost" size="icon">
                                <Link href={saleDetailPath(sale.id)}>
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
                {sales.map((sale) => (
                  <Card key={sale.id} className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {customerLabel(sale.customer)}
                      </CardTitle>
                      <CardDescription>
                        {formatDateBR(sale.sale_date)} ·{" "}
                        {saleStatusLabel(sale.status)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Documento</span>
                        <span>{sale.document_number || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-semibold text-[var(--brand-navy)]">
                          {formatCurrency(sale.total_amount)}
                        </span>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={saleDetailPath(sale.id)}>Ver detalhes</Link>
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
