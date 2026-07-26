"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ROUTES,
  financeDetailPath,
  productDetailPath,
  purchaseDetailPath,
  saleDetailPath,
  stockProductHistoryPath,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDateBR,
  formatStockQuantity,
  toNumberAmount,
} from "@/lib/dashboard/format";
import type { ExecutiveDashboard } from "@/types/database";

type ExecutiveListsProps = {
  data: ExecutiveDashboard;
  showFinance?: boolean;
  showSales?: boolean;
  showPurchases?: boolean;
  showStock?: boolean;
};

export function ExecutiveLists({
  data,
  showFinance = true,
  showSales = true,
  showPurchases = true,
  showStock = true,
}: ExecutiveListsProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {showSales ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Últimas vendas</CardTitle>
                <CardDescription>Confirmadas da empresa ativa</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.sales}>Ver todas</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!data.recent_sales.length ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma venda confirmada ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.recent_sales.map((sale) => (
                    <Link
                      key={sale.id}
                      href={saleDetailPath(sale.id)}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                    >
                      <div>
                        <div className="font-medium">{sale.party_name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDateBR(sale.sale_date)}
                          {sale.document_number
                            ? ` · ${sale.document_number}`
                            : ""}
                        </div>
                      </div>
                      <div className="text-right text-sm font-medium">
                        {formatCurrency(toNumberAmount(sale.total_amount))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {showPurchases ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Últimas compras</CardTitle>
                <CardDescription>Confirmadas da empresa ativa</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.purchases}>Ver todas</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!data.recent_purchases.length ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma compra confirmada ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.recent_purchases.map((purchase) => (
                    <Link
                      key={purchase.id}
                      href={purchaseDetailPath(purchase.id)}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                    >
                      <div>
                        <div className="font-medium">{purchase.party_name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDateBR(purchase.purchase_date)}
                          {purchase.document_number
                            ? ` · ${purchase.document_number}`
                            : ""}
                        </div>
                      </div>
                      <div className="text-right text-sm font-medium">
                        {formatCurrency(toNumberAmount(purchase.total_amount))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {showFinance ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Próximas contas a receber</CardTitle>
                <CardDescription>Somente vencimentos futuros</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.finance}>Financeiro</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!data.upcoming_receivables.length ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta a receber com vencimento futuro.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.upcoming_receivables.map((entry) => (
                    <Link
                      key={entry.id}
                      href={financeDetailPath(entry.id)}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                    >
                      <div>
                        <div className="font-medium">
                          {entry.party_name || entry.description}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Vence em {formatDateBR(entry.due_date)}
                        </div>
                      </div>
                      <div className="text-right text-sm font-medium text-emerald-700">
                        {formatCurrency(toNumberAmount(entry.amount))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Próximas contas a pagar</CardTitle>
                <CardDescription>Somente vencimentos futuros</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.finance}>Financeiro</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!data.upcoming_payables.length ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta a pagar com vencimento futuro.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.upcoming_payables.map((entry) => (
                    <Link
                      key={entry.id}
                      href={financeDetailPath(entry.id)}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                    >
                      <div>
                        <div className="font-medium">
                          {entry.party_name || entry.description}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Vence em {formatDateBR(entry.due_date)}
                        </div>
                      </div>
                      <div className="text-right text-sm font-medium text-rose-700">
                        {formatCurrency(toNumberAmount(entry.amount))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showStock ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Produtos abaixo do mínimo</CardTitle>
              <CardDescription>
                Ativos com controle de estoque
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.stock}>Estoque</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!data.low_stock_products.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhum produto abaixo do estoque mínimo.
              </p>
            ) : (
              <div className="space-y-3">
                {data.low_stock_products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <Link
                        href={productDetailPath(product.id)}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-xs text-destructive">
                        Atual:{" "}
                        {formatStockQuantity(
                          product.current_stock,
                          product.unit
                        )}{" "}
                        · Mínimo:{" "}
                        {formatStockQuantity(product.min_stock, product.unit)}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={stockProductHistoryPath(product.id)}>
                        Histórico
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {toNumberAmount(data.kpis.low_stock_count) > 0 ? (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Há {toNumberAmount(data.kpis.low_stock_count)} produto(s)
                  abaixo do estoque mínimo.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
