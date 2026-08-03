"use client";

import Link from "next/link";
import {
  Eye,
  Loader2,
  ShoppingBag,
  Ticket,
  UserMinus,
  UserPlus,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import {
  CustomersReportChart,
  CustomersSalesDistributionChart,
} from "@/components/reports/customers-report-chart";
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
  CUSTOMER_STATUS_OPTIONS,
  PERSON_TYPE_OPTIONS,
  ROUTES,
  customerDetailPath,
} from "@/lib/constants";
import {
  customerGeoLabel,
  customerLabel,
  customerStatusLabel,
  formatCurrency,
  formatDateBR,
  isDailySeries,
  type CustomersReportKpis,
  type CustomersReportRow,
  type CustomersReportSeriesPoint,
  type CustomersSalesDistributionPoint,
} from "@/lib/reports/format";

type CustomersReportPanelProps = {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  status: string;
  personType: string;
  state: string;
  city: string;
  stateOptions: Array<{ value: string; label: string }>;
  cityOptions: Array<{ value: string; label: string }>;
  rows: CustomersReportRow[];
  kpis: CustomersReportKpis | null;
  series: CustomersReportSeriesPoint[];
  salesDistribution: CustomersSalesDistributionPoint[];
  loading: boolean;
  error: string | null;
  onStatusChange: (value: string) => void;
  onPersonTypeChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
};

export function CustomersReportPanel({
  companyName,
  periodFrom,
  periodTo,
  status,
  personType,
  state,
  city,
  stateOptions,
  cityOptions,
  rows,
  kpis,
  series,
  salesDistribution,
  loading,
  error,
  onStatusChange,
  onPersonTypeChange,
  onStateChange,
  onCityChange,
}: CustomersReportPanelProps) {
  const daily = isDailySeries(periodFrom, periodTo);

  return (
    <div className="space-y-6">
      <Card className="shadow-card print:shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[var(--brand-navy)]">
            Filtros do relatório
          </CardTitle>
          <CardDescription>
            Refine por status, tipo e localização. O período e a empresa ativa
            são controlados no topo e aplicam-se a novos cadastros e à evolução
            da base.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="customers-report-status">Status</Label>
            <Select
              id="customers-report-status"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="all">Todos os status</option>
              {CUSTOMER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customers-report-person-type">Tipo de cliente</Label>
            <Select
              id="customers-report-person-type"
              value={personType}
              onChange={(e) => onPersonTypeChange(e.target.value)}
            >
              <option value="all">Todos os tipos</option>
              {PERSON_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customers-report-state">UF</Label>
            <Select
              id="customers-report-state"
              value={state}
              onChange={(e) => onStateChange(e.target.value)}
            >
              <option value="all">Todas as UFs</option>
              {stateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customers-report-city">Cidade</Label>
            <Select
              id="customers-report-city"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              disabled={cityOptions.length === 0 && city === "all"}
            >
              <option value="all">Todas as cidades</option>
              {cityOptions.map((option) => (
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
            Carregando relatório de clientes...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardKpiCard
              title="Total de clientes"
              value={String(kpis?.totalCustomers ?? 0)}
              hint="Base filtrada da empresa ativa"
              icon={UsersRound}
              accent="navy"
            />
            <DashboardKpiCard
              title="Clientes ativos"
              value={String(kpis?.activeCustomers ?? 0)}
              hint={`${kpis?.inactiveCustomers ?? 0} inativo${(kpis?.inactiveCustomers ?? 0) === 1 ? "" : "s"}`}
              icon={UserRoundCheck}
              accent="emerald"
            />
            <DashboardKpiCard
              title="Clientes inativos"
              value={String(kpis?.inactiveCustomers ?? 0)}
              hint="Status cadastral inativo"
              icon={UserMinus}
              accent="coral"
            />
            <DashboardKpiCard
              title="Novos no período"
              value={String(kpis?.newInPeriod ?? 0)}
              hint={`${formatDateBR(periodFrom)} a ${formatDateBR(periodTo)}`}
              icon={UserPlus}
              accent="sky"
            />
            <DashboardKpiCard
              title="Com vendas"
              value={String(kpis?.withSales ?? 0)}
              hint="Histórico de vendas confirmadas"
              icon={ShoppingBag}
              accent="navy"
            />
            <DashboardKpiCard
              title="Sem vendas"
              value={String(kpis?.withoutSales ?? 0)}
              hint="Sem venda confirmada na empresa"
              icon={UsersRound}
              accent="gold"
            />
            <DashboardKpiCard
              title="Ticket médio por cliente"
              value={formatCurrency(kpis?.averageTicketPerCustomer ?? 0)}
              hint="Confirmadas ÷ clientes com vendas"
              icon={Ticket}
              accent="coral"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card className="shadow-card print:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[var(--brand-navy)]">
                  Evolução da base de clientes
                </CardTitle>
                <CardDescription>
                  {daily
                    ? "Agregação diária no período selecionado"
                    : "Agregação mensal no período selecionado"}
                  {" · "}
                  novos em rosa · acumulado em navy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomersReportChart series={series} daily={daily} />
              </CardContent>
            </Card>

            <Card className="shadow-card print:shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[var(--brand-navy)]">
                  Clientes com vendas × sem vendas
                </CardTitle>
                <CardDescription>
                  Distribuição comercial da base filtrada · histórico confirmado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomersSalesDistributionChart
                  distribution={salesDistribution}
                />
              </CardContent>
            </Card>
          </div>

          {rows.length === 0 ? (
            <Card className="shadow-card border-dashed">
              <CardHeader className="items-center text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-coral)]/15 ring-1 ring-inset ring-[var(--brand-coral)]/25">
                  <UsersRound className="h-6 w-6 text-[var(--brand-coral)]" />
                </div>
                <CardTitle className="text-[var(--brand-navy)]">
                  Nenhum cliente encontrado
                </CardTitle>
                <CardDescription>
                  Não há clientes para {companyName} com os filtros atuais.
                  Ajuste status, tipo, UF ou cidade.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-6 print:hidden">
                <Button asChild variant="outline">
                  <Link href={ROUTES.customers}>Ir para Clientes</Link>
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
                    {rows.length} cliente{rows.length === 1 ? "" : "s"} · vendas
                    confirmadas no histórico da empresa
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nome</th>
                        <th className="px-4 py-3 font-medium">Documento</th>
                        <th className="px-4 py-3 font-medium">E-mail</th>
                        <th className="px-4 py-3 font-medium">Telefone</th>
                        <th className="px-4 py-3 font-medium">Cidade/UF</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Cadastro</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Vendas
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Total comprado
                        </th>
                        <th className="px-4 py-3 font-medium text-right print:hidden">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const cityLabel = customerGeoLabel(row.customer.city);
                        const stateLabel = customerGeoLabel(row.customer.state);
                        const location =
                          cityLabel === "—" && stateLabel === "—"
                            ? "—"
                            : `${cityLabel}/${stateLabel}`;

                        return (
                          <tr
                            key={row.customer.id}
                            className="border-t border-border/70"
                          >
                            <td className="px-4 py-3">
                              {customerLabel(row.customer)}
                            </td>
                            <td className="px-4 py-3">
                              {row.customer.document || "—"}
                            </td>
                            <td className="px-4 py-3">
                              {row.customer.email || "—"}
                            </td>
                            <td className="px-4 py-3">
                              {row.customer.phone || "—"}
                            </td>
                            <td className="px-4 py-3">{location}</td>
                            <td className="px-4 py-3">
                              {customerStatusLabel(row.customer.status)}
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              {formatDateBR(
                                row.customer.created_at.slice(0, 10)
                              )}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {row.salesCount}
                            </td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--brand-navy)]">
                              {formatCurrency(row.totalPurchased)}
                            </td>
                            <td className="px-4 py-3 print:hidden">
                              <div className="flex justify-end">
                                <Button asChild variant="ghost" size="icon">
                                  <Link
                                    href={customerDetailPath(row.customer.id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 md:hidden print:hidden">
                {rows.map((row) => {
                  const cityLabel = customerGeoLabel(row.customer.city);
                  const stateLabel = customerGeoLabel(row.customer.state);
                  const location =
                    cityLabel === "—" && stateLabel === "—"
                      ? "—"
                      : `${cityLabel}/${stateLabel}`;

                  return (
                    <Card key={row.customer.id} className="shadow-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          {customerLabel(row.customer)}
                        </CardTitle>
                        <CardDescription>
                          {customerStatusLabel(row.customer.status)} ·{" "}
                          {formatDateBR(row.customer.created_at.slice(0, 10))}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Documento</span>
                          <span className="text-right">
                            {row.customer.document || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">E-mail</span>
                          <span className="text-right">
                            {row.customer.email || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Telefone</span>
                          <span className="text-right">
                            {row.customer.phone || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Cidade/UF</span>
                          <span className="text-right">{location}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Vendas</span>
                          <span className="tabular-nums">{row.salesCount}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">
                            Total comprado
                          </span>
                          <span className="font-semibold tabular-nums text-[var(--brand-navy)]">
                            {formatCurrency(row.totalPurchased)}
                          </span>
                        </div>
                        <Button asChild variant="outline" className="w-full">
                          <Link href={customerDetailPath(row.customer.id)}>
                            Ver cliente
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
