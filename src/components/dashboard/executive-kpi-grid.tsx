"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Package,
  Scale,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, toNumberAmount } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";
import type { ExecutiveDashboard } from "@/types/database";

type ExecutiveKpiGridProps = {
  kpis: ExecutiveDashboard["kpis"];
  showFinance?: boolean;
  showSales?: boolean;
  showPurchases?: boolean;
  showStock?: boolean;
};

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
  format = "currency",
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "negative" | "warning";
  format?: "currency" | "integer";
}) {
  return (
    <Card
      className={cn(
        tone === "warning" && "border-rose-200 bg-rose-50/40 dark:bg-rose-950/20"
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon
          className={cn(
            "h-4 w-4 text-muted-foreground",
            tone === "warning" && "text-rose-600"
          )}
        />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-bold",
            tone === "positive" && "text-emerald-700",
            tone === "negative" && "text-rose-700",
            tone === "warning" && "text-rose-700"
          )}
        >
          {format === "integer" ? value.toLocaleString("pt-BR") : formatCurrency(value)}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function ExecutiveKpiGrid({
  kpis,
  showFinance = true,
  showSales = true,
  showPurchases = true,
  showStock = true,
}: ExecutiveKpiGridProps) {
  const monthResult = toNumberAmount(kpis.month_result);
  const overdueTotal = toNumberAmount(kpis.overdue_total);

  return (
    <div className="space-y-4">
      {showFinance ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Saldo atual"
            value={toNumberAmount(kpis.current_balance)}
            hint="Pagos e recebidos até hoje"
            icon={Wallet}
            tone={
              toNumberAmount(kpis.current_balance) >= 0 ? "positive" : "negative"
            }
          />
          <KpiCard
            title="Entradas do mês"
            value={toNumberAmount(kpis.month_inflows)}
            hint="Realizadas no mês corrente"
            icon={ArrowUpRight}
            tone="positive"
          />
          <KpiCard
            title="Saídas do mês"
            value={toNumberAmount(kpis.month_outflows)}
            hint="Realizadas no mês corrente"
            icon={ArrowDownRight}
            tone="negative"
          />
          <KpiCard
            title="Resultado do mês"
            value={monthResult}
            hint="Entradas − saídas realizadas"
            icon={Scale}
            tone={monthResult >= 0 ? "positive" : "negative"}
          />
          <KpiCard
            title="A receber em aberto"
            value={toNumberAmount(kpis.open_receivables)}
            hint="Saldo global de pendências"
            icon={ArrowUpRight}
          />
          <KpiCard
            title="A pagar em aberto"
            value={toNumberAmount(kpis.open_payables)}
            hint="Saldo global de pendências"
            icon={ArrowDownRight}
          />
          <Card
            className={cn(
              "sm:col-span-2",
              overdueTotal > 0 &&
                "border-rose-200 bg-rose-50/40 dark:bg-rose-950/20"
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium">
                  Valores vencidos
                </CardTitle>
                <CardDescription className="mt-1">
                  Destacados fora das listas de próximas contas
                </CardDescription>
              </div>
              <AlertTriangle
                className={cn(
                  "h-4 w-4 text-muted-foreground",
                  overdueTotal > 0 && "text-rose-600"
                )}
              />
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Total vencido</p>
                <p
                  className={cn(
                    "text-xl font-bold",
                    overdueTotal > 0 && "text-rose-700"
                  )}
                >
                  {formatCurrency(overdueTotal)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vencido a receber</p>
                <p className="text-xl font-bold">
                  {formatCurrency(toNumberAmount(kpis.overdue_receivables))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vencido a pagar</p>
                <p className="text-xl font-bold">
                  {formatCurrency(toNumberAmount(kpis.overdue_payables))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {(showSales || showPurchases || showStock) && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {showSales ? (
            <>
              <KpiCard
                title="Vendas do mês"
                value={toNumberAmount(kpis.confirmed_sales_total)}
                hint={`${toNumberAmount(kpis.confirmed_sales_count)} venda(s) confirmada(s)`}
                icon={ShoppingBag}
              />
              <KpiCard
                title="Ticket médio"
                value={toNumberAmount(kpis.average_ticket)}
                hint="Média das vendas confirmadas do mês"
                icon={Ticket}
              />
            </>
          ) : null}
          {showPurchases ? (
            <KpiCard
              title="Compras do mês"
              value={toNumberAmount(kpis.confirmed_purchases_total)}
              hint={`${toNumberAmount(kpis.confirmed_purchases_count)} compra(s) confirmada(s)`}
              icon={ShoppingCart}
            />
          ) : null}
          {showStock ? (
            <>
              <KpiCard
                title="Valor do estoque"
                value={toNumberAmount(kpis.stock_value)}
                hint="Custo × saldo dos itens com controle"
                icon={Package}
              />
              <KpiCard
                title="Abaixo do mínimo"
                value={toNumberAmount(kpis.low_stock_count)}
                hint="Produtos ativos com controle de estoque"
                icon={AlertTriangle}
                format="integer"
                tone={
                  toNumberAmount(kpis.low_stock_count) > 0
                    ? "warning"
                    : "default"
                }
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
