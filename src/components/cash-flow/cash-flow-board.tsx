"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  Loader2,
  Scale,
  Wallet,
} from "lucide-react";
import { CashFlowChart } from "@/components/cash-flow/cash-flow-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CASH_FLOW_DIRECTION_OPTIONS,
  CASH_FLOW_GRAIN_OPTIONS,
  CASH_FLOW_GRAINS,
  CASH_FLOW_MODE_OPTIONS,
  CASH_FLOW_MODES,
  CASH_FLOW_ORIGIN_OPTIONS,
  FINANCIAL_CATEGORIES,
  FINANCIAL_STATUS,
  FINANCIAL_STATUS_OPTIONS,
  PAYMENT_METHODS,
  financeDetailPath,
  type CashFlowGrain,
  type CashFlowMode,
} from "@/lib/constants";
import { getCashFlowDashboard } from "@/lib/cash-flow/actions";
import {
  defaultProjectedPeriod,
  defaultRealizedPeriod,
  formatCurrency,
  formatDateBR,
  originLabel,
  paymentMethodLabel,
  statusLabel,
  toNumberAmount,
} from "@/lib/cash-flow/format";
import { installmentLabel } from "@/lib/finance/upcoming";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";
import type { CashFlowDashboard } from "@/types/database";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos os status" },
  ...FINANCIAL_STATUS_OPTIONS.filter(
    (item) => item.value !== FINANCIAL_STATUS.cancelled
  ),
];

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "negative" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-bold",
            tone === "positive" && "text-emerald-700",
            tone === "negative" && "text-rose-700",
            tone === "neutral" && "text-foreground"
          )}
        >
          {formatCurrency(value)}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function CashFlowBoard() {
  const { company } = useTenant();
  const realizedDefault = useMemo(() => defaultRealizedPeriod(), []);
  const projectedDefault = useMemo(() => defaultProjectedPeriod(), []);

  const [mode, setMode] = useState<CashFlowMode>(CASH_FLOW_MODES.realized);
  const [periodFrom, setPeriodFrom] = useState(realizedDefault.from);
  const [periodTo, setPeriodTo] = useState(realizedDefault.to);
  const [direction, setDirection] = useState("all");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [origin, setOrigin] = useState("all");
  const [grain, setGrain] = useState<CashFlowGrain>(CASH_FLOW_GRAINS.day);
  const [dashboard, setDashboard] = useState<CashFlowDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleModeChange = (nextMode: CashFlowMode) => {
    setMode(nextMode);
    if (nextMode === CASH_FLOW_MODES.realized) {
      setPeriodFrom(realizedDefault.from);
      setPeriodTo(realizedDefault.to);
    } else {
      setPeriodFrom(projectedDefault.from);
      setPeriodTo(projectedDefault.to);
    }
  };

  const loadDashboard = useCallback(async () => {
    if (!company?.id) {
      setDashboard(null);
      setLoading(false);
      setError("Selecione uma empresa ativa para ver o fluxo de caixa.");
      return;
    }

    if (!periodFrom || !periodTo) {
      setError("Informe o período completo.");
      setLoading(false);
      return;
    }

    if (periodTo < periodFrom) {
      setError("A data final não pode ser anterior à inicial.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getCashFlowDashboard({
      companyId: company.id,
      periodFrom,
      periodTo,
      mode,
      direction,
      status,
      category,
      paymentMethod,
      origin,
      grain,
    });

    if (result.error || !result.data) {
      setDashboard(null);
      setError(result.error?.message ?? "Erro ao carregar o fluxo de caixa.");
      setLoading(false);
      return;
    }

    setDashboard(result.data);
    setLoading(false);
  }, [
    category,
    company?.id,
    direction,
    grain,
    mode,
    origin,
    paymentMethod,
    periodFrom,
    periodTo,
    status,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadDashboard();
    }, 200);

    return () => clearTimeout(timeout);
  }, [loadDashboard]);

  const kpis = dashboard?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {CASH_FLOW_MODE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={mode === option.value ? "default" : "outline"}
            onClick={() => handleModeChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            O saldo atual é global. Os demais indicadores respeitam o período e
            os filtros abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="period_from">Período de</Label>
            <Input
              id="period_from"
              type="date"
              value={periodFrom}
              onChange={(event) => setPeriodFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="period_to">Período até</Label>
            <Input
              id="period_to"
              type="date"
              value={periodTo}
              onChange={(event) => setPeriodTo(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direction">Tipo</Label>
            <Select
              id="direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
            >
              {CASH_FLOW_DIRECTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">Todas</option>
              {FINANCIAL_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_method">Forma de pagamento</Label>
            <Select
              id="payment_method"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <option value="all">Todas</option>
              {PAYMENT_METHODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="origin">Origem</Label>
            <Select
              id="origin"
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
            >
              <option value="all">Todas</option>
              {CASH_FLOW_ORIGIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="grain">Evolução</Label>
            <Select
              id="grain"
              value={grain}
              onChange={(event) =>
                setGrain(event.target.value as CashFlowGrain)
              }
            >
              {CASH_FLOW_GRAIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando fluxo de caixa...
        </div>
      ) : dashboard && kpis ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              title="Saldo atual"
              value={toNumberAmount(kpis.current_balance)}
              hint="Realizado global até hoje (independente do período)"
              icon={Wallet}
              tone="neutral"
            />
            <KpiCard
              title="Entradas realizadas"
              value={toNumberAmount(kpis.realized_inflows)}
              hint="Recebidos no período filtrado"
              icon={ArrowUpRight}
              tone="positive"
            />
            <KpiCard
              title="Saídas realizadas"
              value={toNumberAmount(kpis.realized_outflows)}
              hint="Pagos no período filtrado"
              icon={ArrowDownRight}
              tone="negative"
            />
            <KpiCard
              title="Saldo do período"
              value={toNumberAmount(kpis.period_balance)}
              hint="Entradas realizadas − saídas realizadas"
              icon={Scale}
              tone={
                toNumberAmount(kpis.period_balance) >= 0
                  ? "positive"
                  : "negative"
              }
            />
            <KpiCard
              title="Contas a receber em aberto"
              value={toNumberAmount(kpis.open_receivables)}
              hint="Pendentes/vencidas com vencimento no período"
              icon={ArrowUpRight}
            />
            <KpiCard
              title="Contas a pagar em aberto"
              value={toNumberAmount(kpis.open_payables)}
              hint="Pendentes/vencidas com vencimento no período"
              icon={ArrowDownRight}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Evolução do fluxo</CardTitle>
              <CardDescription>
                Séries distintas de saldo acumulado: realizado (sólido) e
                projetado (tracejado).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CashFlowChart series={dashboard.series} grain={grain} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Movimentações —{" "}
                {mode === CASH_FLOW_MODES.realized ? "Realizado" : "Projetado"}
              </CardTitle>
              <CardDescription>
                {mode === CASH_FLOW_MODES.realized
                  ? `Saldo acumulado a partir de ${formatCurrency(kpis.realized_opening_balance)} (saldo antes do período).`
                  : `Saldo acumulado a partir de ${formatCurrency(kpis.projected_opening_balance)} (saldo atual realizado).`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.movements.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Nenhuma movimentação no período com os filtros atuais.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="px-2 py-2 font-medium">Data</th>
                        <th className="px-2 py-2 font-medium">Descrição</th>
                        <th className="px-2 py-2 font-medium">
                          Cliente / Fornecedor
                        </th>
                        <th className="px-2 py-2 font-medium">Parcela</th>
                        <th className="px-2 py-2 font-medium">Categoria</th>
                        <th className="px-2 py-2 font-medium">Origem</th>
                        <th className="px-2 py-2 font-medium">Forma</th>
                        <th className="px-2 py-2 text-right font-medium">
                          Entrada
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Saída
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Saldo acum.
                        </th>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.movements.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="px-2 py-3 align-top whitespace-nowrap">
                            <div>{formatDateBR(row.flow_date)}</div>
                            {row.date_is_estimated ? (
                              <div className="text-xs text-amber-700">
                                Data estimada
                              </div>
                            ) : null}
                          </td>
                          <td className="px-2 py-3 align-top">
                            <div className="max-w-[220px] font-medium break-words">
                              {row.description}
                            </div>
                          </td>
                          <td className="px-2 py-3 align-top">
                            <div className="max-w-[160px] break-words">
                              {row.party_name || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-3 align-top tabular-nums whitespace-nowrap">
                            {installmentLabel({
                              installment_number:
                                row.installment_number ?? null,
                              installment_count: row.installment_count ?? null,
                            })}
                          </td>
                          <td className="px-2 py-3 align-top">
                            {row.category || "—"}
                          </td>
                          <td className="px-2 py-3 align-top">
                            {originLabel(row.origin)}
                          </td>
                          <td className="px-2 py-3 align-top">
                            {paymentMethodLabel(row.payment_method)}
                          </td>
                          <td className="px-2 py-3 text-right align-top text-emerald-700 whitespace-nowrap">
                            {toNumberAmount(row.inflow) > 0
                              ? formatCurrency(row.inflow)
                              : "—"}
                          </td>
                          <td className="px-2 py-3 text-right align-top text-rose-700 whitespace-nowrap">
                            {toNumberAmount(row.outflow) > 0
                              ? formatCurrency(row.outflow)
                              : "—"}
                          </td>
                          <td className="px-2 py-3 text-right align-top font-medium whitespace-nowrap">
                            {formatCurrency(row.running_balance)}
                          </td>
                          <td className="px-2 py-3 align-top whitespace-nowrap">
                            {statusLabel(row.status)}
                          </td>
                          <td className="px-2 py-3 align-top">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={financeDetailPath(row.id)}>
                                <Eye className="mr-1 h-4 w-4" />
                                Ver
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
