"use client";

import Link from "next/link";
import {
  Ban,
  Eye,
  Handshake,
  Loader2,
  Percent,
  Target,
  Ticket,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import {
  FunnelCreatedSeriesChart,
  FunnelDistributionChart,
} from "@/components/reports/funnel-report-chart";
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
  OPPORTUNITY_STAGE_OPTIONS,
  ROUTES,
  opportunityDetailPath,
} from "@/lib/constants";
import { opportunityStageLabel } from "@/lib/funnel/format";
import type { CompanyMemberOption } from "@/lib/tasks/actions";
import {
  customerLabel,
  formatCurrency,
  formatDateBR,
  formatFunnelConversionRate,
  funnelAssignedUserLabel,
  funnelOpportunityCustomerLabel,
  isDailySeries,
  opportunityCreatedDate,
  type FunnelReportCreatedSeriesPoint,
  type FunnelReportKpis,
  type FunnelReportRow,
  type FunnelReportStageRow,
} from "@/lib/reports/format";
import type { Customer } from "@/types/database";

type FunnelReportPanelProps = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  stage: string;
  assignedUserId: string;
  customerId: string;
  customers: Customer[];
  members: CompanyMemberOption[];
  rows: FunnelReportRow[];
  kpis: FunnelReportKpis | null;
  stages: FunnelReportStageRow[];
  lostSummary: FunnelReportStageRow | null;
  createdSeries: FunnelReportCreatedSeriesPoint[];
  loading: boolean;
  error: string | null;
  onStageChange: (value: string) => void;
  onAssignedUserChange: (value: string) => void;
  onCustomerChange: (value: string) => void;
};

export function FunnelReportPanel({
  companyName,
  periodFrom,
  periodTo,
  stage,
  assignedUserId,
  customerId,
  customers,
  members,
  rows,
  kpis,
  stages,
  lostSummary,
  createdSeries,
  loading,
  error,
  onStageChange,
  onAssignedUserChange,
  onCustomerChange,
}: FunnelReportPanelProps) {
  const daily = isDailySeries(periodFrom, periodTo);
  const emptyLostSummary: FunnelReportStageRow = lostSummary ?? {
    stage: "lost",
    label: opportunityStageLabel("lost"),
    count: 0,
    totalValue: 0,
    percent: 0,
    color: "#94a3b8",
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card print:shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[var(--brand-navy)]">
            Filtros do relatório
          </CardTitle>
          <CardDescription>
            Refine por etapa, responsável e cliente. O período usa a data de
            criação da oportunidade e a empresa ativa no topo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="funnel-report-stage">Etapa</Label>
            <Select
              id="funnel-report-stage"
              value={stage}
              onChange={(e) => onStageChange(e.target.value)}
            >
              <option value="all">Todas as etapas</option>
              {OPPORTUNITY_STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="funnel-report-assigned">Responsável</Label>
            <Select
              id="funnel-report-assigned"
              value={assignedUserId}
              onChange={(e) => onAssignedUserChange(e.target.value)}
            >
              <option value="all">Todos os responsáveis</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name?.trim() || "Sem nome"}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="funnel-report-customer">Cliente</Label>
            <Select
              id="funnel-report-customer"
              value={customerId}
              onChange={(e) => onCustomerChange(e.target.value)}
            >
              <option value="all">Todos os clientes</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customerLabel(customer)}
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
            Carregando relatório do funil comercial...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardKpiCard
              title="Total de oportunidades"
              value={String(kpis?.totalCount ?? 0)}
              hint="Ativas criadas no período filtrado"
              icon={Target}
              accent="navy"
            />
            <DashboardKpiCard
              title="Valor total"
              value={formatCurrency(kpis?.totalValue ?? 0)}
              hint="Soma dos valores estimados"
              icon={Wallet}
              accent="gold"
            />
            <DashboardKpiCard
              title="Valor em aberto"
              value={formatCurrency(kpis?.openValue ?? 0)}
              hint={`${kpis?.openCount ?? 0} no pipeline inicial`}
              icon={TrendingUp}
              accent="sky"
            />
            <DashboardKpiCard
              title="Contrato fechado"
              value={String(kpis?.closedCount ?? 0)}
              hint="Somente etapa Contrato fechado"
              icon={Handshake}
              accent="emerald"
            />
            <DashboardKpiCard
              title="Oportunidades perdidas"
              value={String(kpis?.lostCount ?? 0)}
              hint="Etapa Perdido (fora da sequência)"
              icon={Ban}
              accent="coral"
            />
            <DashboardKpiCard
              title="Taxa de conversão"
              value={formatFunnelConversionRate(kpis?.conversionRate ?? 0)}
              hint="Contrato fechado ÷ total × 100"
              icon={Percent}
              accent="navy"
            />
            <DashboardKpiCard
              title="Ticket médio fechado"
              value={formatCurrency(kpis?.averageClosedTicket ?? 0)}
              hint="Valor ÷ qtd. em Contrato fechado"
              icon={Ticket}
              accent="gold"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <Card className="shadow-card print:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[var(--brand-navy)]">
                  Distribuição do funil
                </CardTitle>
                <CardDescription>
                  8 etapas oficiais · Perdido em indicador separado · % sobre o
                  total filtrado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FunnelDistributionChart
                  stages={stages}
                  lostSummary={emptyLostSummary}
                />
              </CardContent>
            </Card>

            <Card className="shadow-card print:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[var(--brand-navy)]">
                  Oportunidades criadas por período
                </CardTitle>
                <CardDescription>
                  {daily
                    ? "Agregação diária no período selecionado"
                    : "Agregação mensal no período selecionado"}
                  {" · "}
                  quantidade de novas oportunidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FunnelCreatedSeriesChart
                  series={createdSeries}
                  daily={daily}
                />
              </CardContent>
            </Card>
          </div>

          {rows.length === 0 ? (
            <Card className="shadow-card border-dashed">
              <CardHeader className="items-center text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-coral)]/15 ring-1 ring-inset ring-[var(--brand-coral)]/25">
                  <Target className="h-6 w-6 text-[var(--brand-coral)]" />
                </div>
                <CardTitle className="text-[var(--brand-navy)]">
                  Nenhuma oportunidade no período
                </CardTitle>
                <CardDescription>
                  Não há oportunidades ativas criadas para {companyName} com os
                  filtros atuais. Ajuste período, etapa, responsável ou cliente.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-6 print:hidden">
                <Button asChild variant="outline">
                  <Link href={ROUTES.funnel}>Ir para Funil Comercial</Link>
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
                    {rows.length} oportunidade
                    {rows.length === 1 ? "" : "s"} · criadas entre{" "}
                    {formatDateBR(periodFrom)} e {formatDateBR(periodTo)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Criação</th>
                        <th className="px-4 py-3 font-medium">Oportunidade</th>
                        <th className="px-4 py-3 font-medium">Cliente</th>
                        <th className="px-4 py-3 font-medium">Responsável</th>
                        <th className="px-4 py-3 font-medium">Etapa</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Valor estimado
                        </th>
                        <th className="px-4 py-3 font-medium">Próxima ação</th>
                        <th className="px-4 py-3 font-medium text-right print:hidden">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-border/70"
                        >
                          <td className="px-4 py-3 tabular-nums">
                            {formatDateBR(opportunityCreatedDate(row))}
                          </td>
                          <td className="px-4 py-3 font-medium text-[var(--brand-navy)]">
                            {row.title}
                          </td>
                          <td className="px-4 py-3">
                            {funnelOpportunityCustomerLabel(row)}
                          </td>
                          <td className="px-4 py-3">
                            {funnelAssignedUserLabel(row)}
                          </td>
                          <td className="px-4 py-3">
                            {opportunityStageLabel(row.stage)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--brand-navy)]">
                            {formatCurrency(row.estimated_value)}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {row.next_action_date
                              ? formatDateBR(row.next_action_date)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 print:hidden">
                            <div className="flex justify-end">
                              <Button asChild variant="ghost" size="icon">
                                <Link href={opportunityDetailPath(row.id)}>
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
                  <Card key={row.id} className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{row.title}</CardTitle>
                      <CardDescription>
                        {opportunityStageLabel(row.stage)} ·{" "}
                        {formatDateBR(opportunityCreatedDate(row))}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Cliente</span>
                        <span className="text-right">
                          {funnelOpportunityCustomerLabel(row)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">
                          Responsável
                        </span>
                        <span className="text-right">
                          {funnelAssignedUserLabel(row)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">
                          Valor estimado
                        </span>
                        <span className="font-semibold tabular-nums text-[var(--brand-navy)]">
                          {formatCurrency(row.estimated_value)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">
                          Próxima ação
                        </span>
                        <span className="tabular-nums">
                          {row.next_action_date
                            ? formatDateBR(row.next_action_date)
                            : "—"}
                        </span>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <Link href={opportunityDetailPath(row.id)}>
                          Ver oportunidade
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
