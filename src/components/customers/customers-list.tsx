"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  UsersRound,
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
  CUSTOMER_STATUS_OPTIONS,
  PERSON_TYPE_OPTIONS,
  ROUTES,
  customerDetailPath,
  customerEditPath,
} from "@/lib/constants";
import { listCustomers } from "@/lib/customers/actions";
import { useTenant } from "@/providers/tenant-provider";
import type { Customer } from "@/types/database";

function statusLabel(status: string) {
  return (
    CUSTOMER_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

function personTypeLabel(personType: string) {
  return (
    PERSON_TYPE_OPTIONS.find((item) => item.value === personType)?.label ??
    personType
  );
}

export function CustomersList() {
  const { company } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [personType, setPersonType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!company?.id) {
      setCustomers([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar clientes.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listCustomers({
      companyId: company.id,
      search,
      status,
      personType,
    });

    if (result.error) {
      setCustomers([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setCustomers(result.data);
    setLoading(false);
  }, [company?.id, search, status, personType]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadCustomers();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadCustomers]);

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa ativa</CardTitle>
          <CardDescription>
            Selecione ou cadastre uma empresa para gerenciar clientes.
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
          <Link href={ROUTES.customersNew}>
            <Plus className="h-4 w-4" />
            Novo cliente
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos os status</option>
          {CUSTOMER_STATUS_OPTIONS.map((option) => (
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
            Carregando clientes...
          </CardContent>
        </Card>
      ) : customers.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <UsersRound className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Nenhum cliente encontrado</CardTitle>
            <CardDescription>
              Cadastre o primeiro cliente da empresa {company.name} ou ajuste
              os filtros de busca.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button asChild>
              <Link href={ROUTES.customersNew}>
                <Plus className="h-4 w-4" />
                Novo cliente
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
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{customer.full_name}</div>
                      {customer.trade_name ? (
                        <div className="text-xs text-muted-foreground">
                          {customer.trade_name}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{customer.document || "—"}</td>
                    <td className="px-4 py-3">
                      {personTypeLabel(customer.person_type)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          customer.status === "active"
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {statusLabel(customer.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>{customer.email || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {customer.phone || customer.whatsapp || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={customerDetailPath(customer.id)}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon">
                          <Link href={customerEditPath(customer.id)}>
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
            {customers.map((customer) => (
              <Card key={customer.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {customer.full_name}
                  </CardTitle>
                  <CardDescription>
                    {personTypeLabel(customer.person_type)} ·{" "}
                    {statusLabel(customer.status)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Documento</p>
                    <p>{customer.document || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Contato</p>
                    <p>{customer.email || customer.phone || "—"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={customerDetailPath(customer.id)}>Ver</Link>
                    </Button>
                    <Button asChild className="flex-1">
                      <Link href={customerEditPath(customer.id)}>Editar</Link>
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
