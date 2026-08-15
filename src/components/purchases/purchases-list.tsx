"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Loader2, Pencil, Plus, Search, ShoppingCart } from "lucide-react";
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
  PURCHASE_STATUS,
  PURCHASE_STATUS_OPTIONS,
  ROUTES,
  purchaseDetailPath,
  purchaseEditPath,
} from "@/lib/constants";
import {
  listPurchases,
  type PurchaseListItem,
} from "@/lib/purchases/actions";
import {
  formatCurrency,
  formatDateBR,
  purchaseStatusLabel,
} from "@/lib/purchases/format";
import { listSuppliers } from "@/lib/suppliers/actions";
import { PERMISSION_MODULES } from "@/lib/users/permissions";
import { useTenant } from "@/providers/tenant-provider";
import type { Supplier } from "@/types/database";

export function PurchasesList() {
  const { company, creatableModules, editableModules } = useTenant();
  const canCreate = creatableModules.includes(PERMISSION_MODULES.purchases);
  const canEdit = editableModules.includes(PERMISSION_MODULES.purchases);
  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [supplierId, setSupplierId] = useState("all");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPurchases = useCallback(async () => {
    if (!company?.id) {
      setPurchases([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar compras.");
      return;
    }

    setLoading(true);
    setError(null);

    const [purchasesResult, suppliersResult] = await Promise.all([
      listPurchases({
        companyId: company.id,
        search,
        status,
        supplierId,
        periodFrom: periodFrom || undefined,
        periodTo: periodTo || undefined,
      }),
      listSuppliers({ companyId: company.id, status: "active" }),
    ]);

    if (suppliersResult.data) setSuppliers(suppliersResult.data);

    if (purchasesResult.error) {
      setPurchases([]);
      setError(purchasesResult.error.message);
      setLoading(false);
      return;
    }

    setPurchases(purchasesResult.data);
    setLoading(false);
  }, [company?.id, search, status, supplierId, periodFrom, periodTo]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadPurchases();
    }, 250);
    return () => clearTimeout(timeout);
  }, [loadPurchases]);

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa ativa</CardTitle>
          <CardDescription>
            Selecione ou cadastre uma empresa para gerenciar compras.
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
            placeholder="Buscar por documento, fornecedor ou observação"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href={ROUTES.purchasesNew}>
              <Plus className="h-4 w-4" />
              Nova compra
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos os status</option>
          {PURCHASE_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="all">Todos os fornecedores</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.trade_name || supplier.full_name}
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
            Carregando compras...
          </CardContent>
        </Card>
      ) : purchases.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Nenhuma compra encontrada</CardTitle>
            <CardDescription>
              Cadastre a primeira compra da empresa {company.name}.
            </CardDescription>
          </CardHeader>
          {canCreate ? (
            <CardContent className="flex justify-center pb-6">
              <Button asChild>
                <Link href={ROUTES.purchasesNew}>
                  <Plus className="h-4 w-4" />
                  Nova compra
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
                  <th className="px-4 py-3 font-medium">Fornecedor</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-t">
                    <td className="px-4 py-3">
                      {formatDateBR(purchase.purchase_date)}
                    </td>
                    <td className="px-4 py-3">
                      {purchase.supplier?.trade_name ||
                        purchase.supplier?.full_name ||
                        "—"}
                    </td>
                    <td className="px-4 py-3">
                      {purchase.document_number || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(purchase.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      {purchaseStatusLabel(purchase.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={purchaseDetailPath(purchase.id)}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {canEdit &&
                        purchase.status === PURCHASE_STATUS.draft ? (
                          <Button asChild variant="ghost" size="icon">
                            <Link href={purchaseEditPath(purchase.id)}>
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
            {purchases.map((purchase) => (
              <Card key={purchase.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {purchase.supplier?.trade_name ||
                      purchase.supplier?.full_name ||
                      "Sem fornecedor"}
                  </CardTitle>
                  <CardDescription>
                    {formatDateBR(purchase.purchase_date)} ·{" "}
                    {purchaseStatusLabel(purchase.status)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium">
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
    </div>
  );
}
