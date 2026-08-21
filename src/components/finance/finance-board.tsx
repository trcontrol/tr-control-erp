"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Wallet,
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
import { UpcomingReceivablesCard } from "@/components/finance/upcoming-receivables-card";
import {
  FINANCIAL_ENTRY_TYPES,
  FINANCIAL_STATUS,
  FINANCIAL_STATUS_OPTIONS,
  ROUTES,
  financeDetailPath,
  financeEditPath,
  type FinancialEntryType,
} from "@/lib/constants";
import {
  getUpcomingReceivables,
  listFinancialEntries,
  markFinancialEntrySettled,
  type FinancialEntryWithRelations,
} from "@/lib/finance/actions";
import {
  formatCurrency,
  formatDateBR,
  toNumberAmount,
} from "@/lib/finance/format";
import {
  UPCOMING_RECEIVABLES_DEFAULT_WINDOW,
  installmentLabel,
  type UpcomingReceivablesWindow,
} from "@/lib/finance/upcoming";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";
import { PERMISSION_MODULES } from "@/lib/users/permissions";

const RECEIVABLES_LIST_ANCHOR = "finance-receivables-list";

function statusLabel(status: string) {
  return (
    FINANCIAL_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

export function FinanceBoard() {
  const { company, creatableModules, editableModules } = useTenant();
  const canCreate = creatableModules.includes(PERMISSION_MODULES.finance);
  const canEdit = editableModules.includes(PERMISSION_MODULES.finance);
  const [tab, setTab] = useState<FinancialEntryType>(
    FINANCIAL_ENTRY_TYPES.payable
  );
  const [entries, setEntries] = useState<FinancialEntryWithRelations[]>([]);
  const [upcoming, setUpcoming] = useState<FinancialEntryWithRelations[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingWindow, setUpcomingWindow] =
    useState<UpcomingReceivablesWindow>(UPCOMING_RECEIVABLES_DEFAULT_WINDOW);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const isReceivableTab = tab === FINANCIAL_ENTRY_TYPES.receivable;

  const loadUpcoming = useCallback(async () => {
    if (!company?.id) {
      setUpcoming([]);
      setUpcomingLoading(false);
      return;
    }

    setUpcomingLoading(true);
    const result = await getUpcomingReceivables(company.id, upcomingWindow);
    if (result.error || !result.data) {
      setUpcoming([]);
      setUpcomingLoading(false);
      return;
    }

    setUpcoming(result.data);
    setUpcomingLoading(false);
  }, [company?.id, upcomingWindow]);

  const loadEntries = useCallback(async () => {
    if (!company?.id) {
      setEntries([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar o financeiro.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listFinancialEntries({
      companyId: company.id,
      entryType: tab,
      status,
      search,
      periodFrom: periodFrom || undefined,
      periodTo: periodTo || undefined,
    });

    if (result.error) {
      setEntries([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setEntries(result.data);
    setLoading(false);
  }, [company?.id, tab, status, search, periodFrom, periodTo]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadEntries();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadEntries]);

  useEffect(() => {
    if (!isReceivableTab) return;
    void loadUpcoming();
  }, [isReceivableTab, loadUpcoming]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        const amount = toNumberAmount(entry.amount);

        if (
          entry.status === FINANCIAL_STATUS.pending ||
          entry.status === FINANCIAL_STATUS.overdue
        ) {
          acc.pending += amount;
        }

        if (
          entry.status === FINANCIAL_STATUS.paid ||
          entry.status === FINANCIAL_STATUS.received
        ) {
          acc.settled += amount;
        }

        if (entry.status === FINANCIAL_STATUS.overdue) {
          acc.overdue += amount;
        }

        return acc;
      },
      { pending: 0, settled: 0, overdue: 0 }
    );
  }, [entries]);

  async function handleSettle(entry: FinancialEntryWithRelations) {
    if (!company?.id) return;

    setSettlingId(entry.id);
    setError(null);
    setSuccess(null);

    const result = await markFinancialEntrySettled(company.id, entry);

    if (result.error) {
      setError(result.error.message);
      setSettlingId(null);
      return;
    }

    setSuccess(
      entry.entry_type === FINANCIAL_ENTRY_TYPES.payable
        ? "Lançamento marcado como pago."
        : "Lançamento marcado como recebido."
    );
    setSettlingId(null);
    await Promise.all([loadEntries(), loadUpcoming()]);
  }

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa ativa</CardTitle>
          <CardDescription>
            Selecione ou cadastre uma empresa para usar o módulo financeiro.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border p-1">
          <button
            type="button"
            onClick={() => setTab(FINANCIAL_ENTRY_TYPES.payable)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === FINANCIAL_ENTRY_TYPES.payable
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Contas a pagar
          </button>
          <button
            type="button"
            onClick={() => setTab(FINANCIAL_ENTRY_TYPES.receivable)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === FINANCIAL_ENTRY_TYPES.receivable
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Contas a receber
          </button>
        </div>

        {canCreate ? (
          <Button asChild>
            <Link href={`${ROUTES.financeNew}?type=${tab}`}>
              <Plus className="h-4 w-4" />
              Novo lançamento
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total pendente</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(totals.pending)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {tab === FINANCIAL_ENTRY_TYPES.payable
                ? "Total pago"
                : "Total recebido"}
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(totals.settled)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total vencido</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {formatCurrency(totals.overdue)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {isReceivableTab ? (
        <UpcomingReceivablesCard
          entries={upcoming}
          window={upcomingWindow}
          onWindowChange={setUpcomingWindow}
          loading={upcomingLoading}
          listAnchorId={RECEIVABLES_LIST_ANCHOR}
        />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por descrição, categoria ou documento"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos os status</option>
          {FINANCIAL_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-2 lg:col-span-1">
          <Input
            type="date"
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
            aria-label="Período de"
          />
          <Input
            type="date"
            value={periodTo}
            onChange={(e) => setPeriodTo(e.target.value)}
            aria-label="Período até"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md bg-primary/10 p-3 text-sm text-foreground">
          {success}
        </div>
      ) : null}

      <div id={RECEIVABLES_LIST_ANCHOR} className="scroll-mt-4 space-y-3">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando lançamentos...
            </CardContent>
          </Card>
        ) : entries.length === 0 ? (
          <Card>
            <CardHeader className="items-center text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Nenhum lançamento encontrado</CardTitle>
              <CardDescription>
                Crie o primeiro lançamento de{" "}
                {tab === FINANCIAL_ENTRY_TYPES.payable
                  ? "contas a pagar"
                  : "contas a receber"}{" "}
                para a empresa {company.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              {canCreate ? (
                <Button asChild>
                  <Link href={`${ROUTES.financeNew}?type=${tab}`}>
                    <Plus className="h-4 w-4" />
                    Novo lançamento
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">
                      {tab === FINANCIAL_ENTRY_TYPES.payable
                        ? "Fornecedor"
                        : "Cliente"}
                    </th>
                    {isReceivableTab ? (
                      <th className="px-4 py-3 font-medium">Parcela</th>
                    ) : null}
                    <th className="px-4 py-3 font-medium">Vencimento</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{entry.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.category || "Sem categoria"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {entry.party_name ||
                          entry.supplier?.full_name ||
                          entry.customer?.full_name ||
                          "—"}
                      </td>
                      {isReceivableTab ? (
                        <td className="px-4 py-3 tabular-nums">
                          {installmentLabel(entry)}
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        {formatDateBR(entry.due_date)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            entry.status === FINANCIAL_STATUS.overdue
                              ? "text-destructive"
                              : undefined
                          }
                        >
                          {statusLabel(entry.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {canEdit &&
                          (entry.status === FINANCIAL_STATUS.pending ||
                            entry.status === FINANCIAL_STATUS.overdue) ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title={
                                tab === FINANCIAL_ENTRY_TYPES.payable
                                  ? "Marcar como pago"
                                  : "Marcar como recebido"
                              }
                              disabled={settlingId === entry.id}
                              onClick={() => void handleSettle(entry)}
                            >
                              {settlingId === entry.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                          ) : null}
                          <Button asChild variant="ghost" size="icon">
                            <Link href={financeDetailPath(entry.id)}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {canEdit ? (
                            <Button asChild variant="ghost" size="icon">
                              <Link href={financeEditPath(entry.id)}>
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
              {entries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {entry.description}
                    </CardTitle>
                    <CardDescription>
                      {statusLabel(entry.status)} ·{" "}
                      {formatDateBR(entry.due_date)}
                      {isReceivableTab
                        ? ` · Parcela ${installmentLabel(entry)}`
                        : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor</span>
                      <span className="font-medium">
                        {formatCurrency(entry.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {tab === FINANCIAL_ENTRY_TYPES.payable
                          ? "Fornecedor"
                          : "Cliente"}
                      </span>
                      <span>
                        {entry.party_name ||
                          entry.supplier?.full_name ||
                          entry.customer?.full_name ||
                          "—"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canEdit &&
                      (entry.status === FINANCIAL_STATUS.pending ||
                        entry.status === FINANCIAL_STATUS.overdue) ? (
                        <Button
                          className="flex-1"
                          variant="secondary"
                          disabled={settlingId === entry.id}
                          onClick={() => void handleSettle(entry)}
                        >
                          {tab === FINANCIAL_ENTRY_TYPES.payable
                            ? "Marcar pago"
                            : "Marcar recebido"}
                        </Button>
                      ) : null}
                      <Button asChild variant="outline" className="flex-1">
                        <Link href={financeDetailPath(entry.id)}>Ver</Link>
                      </Button>
                      {canEdit ? (
                        <Button asChild className="flex-1">
                          <Link href={financeEditPath(entry.id)}>Editar</Link>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
