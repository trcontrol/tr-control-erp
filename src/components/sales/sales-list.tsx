"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Loader2, Pencil, Plus, Printer, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ROUTES,
  SALE_STATUS,
  SALE_STATUS_OPTIONS,
  saleDetailPath,
  saleEditPath,
  saleReceiptPath,
} from "@/lib/constants";
import { listCustomers } from "@/lib/customers/actions";
import { listSales, type SaleListItem } from "@/lib/sales/actions";
import {
  formatCurrency,
  formatDateBR,
  saleStatusLabel,
} from "@/lib/sales/format";
import { PERMISSION_MODULES } from "@/lib/users/permissions";
import { useTenant } from "@/providers/tenant-provider";
import type { Customer } from "@/types/database";

export function SalesList() {
  const { company, creatableModules, editableModules } = useTenant();
  const canCreate = creatableModules.includes(PERMISSION_MODULES.sales);
  const canEdit = editableModules.includes(PERMISSION_MODULES.sales);
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [customerId, setCustomerId] = useState("all");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSales = useCallback(async () => {
    if (!company?.id) {
      setSales([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar vendas.");
      return;
    }

    setLoading(true);
    setError(null);

    const [salesResult, customersResult] = await Promise.all([
      listSales({
        companyId: company.id,
        search,
        status,
        customerId,
        periodFrom: periodFrom || undefined,
        periodTo: periodTo || undefined,
      }),
      listCustomers({ companyId: company.id, status: "active" }),
    ]);

    if (customersResult.data) setCustomers(customersResult.data);

    if (salesResult.error) {
      setSales([]);
      setError(salesResult.error.message);
      setLoading(false);
      return;
    }

    setSales(salesResult.data);
    setLoading(false);
  }, [company?.id, search, status, customerId, periodFrom, periodTo]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadSales();
    }, 250);
    return () => clearTimeout(timeout);
  }, [loadSales]);

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa ativa</CardTitle>
          <CardDescription>
            Selecione ou cadastre uma empresa para gerenciar vendas.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por documento, cliente ou observação"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href={ROUTES.salesNew}>
              <Plus className="h-4 w-4" />
              Nova venda
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos os status</option>
          {SALE_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="all">Todos os clientes</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.trade_name || customer.full_name}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={periodFrom}
          onChange={(e) => setPeriodFrom(e.target.value)}
          aria-label="Data inicial"
        />
        <Input
          type="date"
          value={periodTo}
          onChange={(e) => setPeriodTo(e.target.value)}
          aria-label="Data final"
        />
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando vendas...
          </CardContent>
        </Card>
      ) : sales.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Nenhuma venda encontrada</CardTitle>
            <CardDescription>
              Cadastre a primeira venda da empresa {company.name}.
            </CardDescription>
          </CardHeader>
          {canCreate ? (
            <CardContent className="flex justify-center pb-6">
              <Button asChild>
                <Link href={ROUTES.salesNew}>
                  <Plus className="h-4 w-4" />
                  Nova venda
                </Link>
              </Button>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-t">
                    <td className="px-4 py-3">
                      {formatDateBR(sale.sale_date)}
                    </td>
                    <td className="px-4 py-3">
                      {sale.customer?.trade_name ||
                        sale.customer?.full_name ||
                        "—"}
                    </td>
                    <td className="px-4 py-3">
                      {sale.document_number || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(sale.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      {saleStatusLabel(sale.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={saleDetailPath(sale.id)}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            href={saleReceiptPath(sale.id)}
                            title="Imprimir comprovante"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>
                        </Button>
                        {canEdit && sale.status === SALE_STATUS.draft ? (
                          <Button asChild variant="ghost" size="icon">
                            <Link href={saleEditPath(sale.id)}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {sales.map((sale) => (
              <Card key={sale.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {sale.customer?.trade_name ||
                      sale.customer?.full_name ||
                      "Sem cliente"}
                  </CardTitle>
                  <CardDescription>
                    {formatDateBR(sale.sale_date)} ·{" "}
                    {saleStatusLabel(sale.status)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium">
                      {formatCurrency(sale.total_amount)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={saleDetailPath(sale.id)}>Ver detalhes</Link>
                    </Button>
                    <Button asChild variant="outline" size="icon">
                      <Link
                        href={saleReceiptPath(sale.id)}
                        title="Imprimir comprovante"
                      >
                        <Printer className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
