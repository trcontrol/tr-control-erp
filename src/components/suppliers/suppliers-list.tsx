"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Truck,
} from "lucide-react";
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
  PERSON_TYPE_OPTIONS,
  ROUTES,
  SUPPLIER_STATUS_OPTIONS,
  supplierDetailPath,
  supplierEditPath,
} from "@/lib/constants";
import { listSuppliers } from "@/lib/suppliers/actions";
import { useTenant } from "@/providers/tenant-provider";
import type { Supplier } from "@/types/database";

function statusLabel(status: string) {
  return (
    SUPPLIER_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

function personTypeLabel(personType: string) {
  return (
    PERSON_TYPE_OPTIONS.find((item) => item.value === personType)?.label ??
    personType
  );
}

export function SuppliersList() {
  const { company } = useTenant();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [personType, setPersonType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    if (!company?.id) {
      setSuppliers([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar fornecedores.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listSuppliers({
      companyId: company.id,
      search,
      status,
      personType,
    });

    if (result.error) {
      setSuppliers([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setSuppliers(result.data);
    setLoading(false);
  }, [company?.id, search, status, personType]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadSuppliers();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadSuppliers]);

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa ativa</CardTitle>
          <CardDescription>
            Selecione ou cadastre uma empresa para gerenciar fornecedores.
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
            placeholder="Buscar por nome, documento ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button asChild>
          <Link href={ROUTES.suppliersNew}>
            <Plus className="h-4 w-4" />
            Novo fornecedor
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos os status</option>
          {SUPPLIER_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          value={personType}
          onChange={(e) => setPersonType(e.target.value)}
        >
          <option value="all">Todos os tipos</option>
          {PERSON_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
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
            Carregando fornecedores...
          </CardContent>
        </Card>
      ) : suppliers.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Truck className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Nenhum fornecedor encontrado</CardTitle>
            <CardDescription>
              Cadastre o primeiro fornecedor da empresa {company.name} ou
              ajuste os filtros de busca.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button asChild>
              <Link href={ROUTES.suppliersNew}>
                <Plus className="h-4 w-4" />
                Novo fornecedor
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Fornecedor</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{supplier.full_name}</div>
                      {supplier.trade_name ? (
                        <div className="text-xs text-muted-foreground">
                          {supplier.trade_name}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{supplier.document || "—"}</td>
                    <td className="px-4 py-3">
                      {personTypeLabel(supplier.person_type)}
                    </td>
                    <td className="px-4 py-3">
                      {statusLabel(supplier.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div>{supplier.email || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {supplier.phone || supplier.whatsapp || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={supplierDetailPath(supplier.id)}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon">
                          <Link href={supplierEditPath(supplier.id)}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {suppliers.map((supplier) => (
              <Card key={supplier.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {supplier.full_name}
                  </CardTitle>
                  <CardDescription>
                    {personTypeLabel(supplier.person_type)} ·{" "}
                    {statusLabel(supplier.status)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Documento</p>
                    <p>{supplier.document || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Contato</p>
                    <p>{supplier.email || supplier.phone || "—"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={supplierDetailPath(supplier.id)}>Ver</Link>
                    </Button>
                    <Button asChild className="flex-1">
                      <Link href={supplierEditPath(supplier.id)}>Editar</Link>
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
