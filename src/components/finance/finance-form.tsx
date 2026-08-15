"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FINANCIAL_CATEGORIES,
  FINANCIAL_ENTRY_TYPES,
  FINANCIAL_ENTRY_TYPE_OPTIONS,
  FINANCIAL_STATUS,
  FINANCIAL_STATUS_OPTIONS,
  PAYMENT_METHODS,
  ROUTES,
  financeDetailPath,
  type FinancialEntryType,
} from "@/lib/constants";
import {
  createFinancialEntry,
  updateFinancialEntry,
} from "@/lib/finance/actions";
import {
  formatCurrencyInput,
  parseCurrencyInput,
  todayISODate,
} from "@/lib/finance/format";
import { listCustomers } from "@/lib/customers/actions";
import { listSuppliers } from "@/lib/suppliers/actions";
import { useTenant } from "@/providers/tenant-provider";
import { PERMISSION_MODULES } from "@/lib/users/permissions";
import type {
  Customer,
  FinancialEntry,
  FinancialEntryInsert,
  Supplier,
} from "@/types/database";

type FinanceFormState = {
  entry_type: FinancialEntryType;
  description: string;
  category: string;
  customer_id: string;
  supplier_id: string;
  party_name: string;
  amount: string;
  issue_date: string;
  due_date: string;
  payment_date: string;
  status: string;
  payment_method: string;
  document_number: string;
  notes: string;
  is_recurring: string;
};

type FinanceFormProps = {
  mode: "create" | "edit";
  entry?: FinancialEntry;
  defaultType?: FinancialEntryType;
};

function toFormState(
  entry?: FinancialEntry,
  defaultType: FinancialEntryType = FINANCIAL_ENTRY_TYPES.payable
): FinanceFormState {
  return {
    entry_type:
      entry?.entry_type === FINANCIAL_ENTRY_TYPES.receivable
        ? FINANCIAL_ENTRY_TYPES.receivable
        : defaultType,
    description: entry?.description ?? "",
    category: entry?.category ?? "",
    customer_id: entry?.customer_id ?? "",
    supplier_id: entry?.supplier_id ?? "",
    party_name: entry?.party_name ?? "",
    amount:
      entry?.amount != null
        ? formatCurrencyInput(String(Math.round(Number(entry.amount) * 100)))
        : "",
    issue_date: entry?.issue_date ?? todayISODate(),
    due_date: entry?.due_date ?? todayISODate(),
    payment_date: entry?.payment_date ?? "",
    status: entry?.status ?? FINANCIAL_STATUS.pending,
    payment_method: entry?.payment_method ?? "",
    document_number: entry?.document_number ?? "",
    notes: entry?.notes ?? "",
    is_recurring: entry?.is_recurring ? "yes" : "no",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function FinanceForm({ mode, entry, defaultType }: FinanceFormProps) {
  const router = useRouter();
  const { company, creatableModules, editableModules } = useTenant();
  const canCreate = creatableModules.includes(PERMISSION_MODULES.finance);
  const canEdit = editableModules.includes(PERMISSION_MODULES.finance);
  const actionAllowed = mode === "create" ? canCreate : canEdit;
  const [form, setForm] = useState<FinanceFormState>(() =>
    toFormState(entry, defaultType)
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FinanceFormState, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!company?.id) return;

    void listCustomers({ companyId: company.id, status: "active" }).then(
      (result) => {
        if (result.data) setCustomers(result.data);
      }
    );

    void listSuppliers({ companyId: company.id, status: "active" }).then(
      (result) => {
        if (result.data) setSuppliers(result.data);
      }
    );
  }, [company?.id]);

  function updateField<K extends keyof FinanceFormState>(
    key: K,
    value: FinanceFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSuccess(null);
  }

  function validate() {
    const nextErrors: Partial<Record<keyof FinanceFormState, string>> = {};
    const amount = parseCurrencyInput(form.amount);

    if (!form.description.trim()) nextErrors.description = "Campo obrigatório";
    if (!form.due_date) nextErrors.due_date = "Campo obrigatório";
    if (!form.issue_date) nextErrors.issue_date = "Campo obrigatório";
    if (!form.amount.trim() || Number.isNaN(amount) || amount <= 0) {
      nextErrors.amount = "Informe um valor válido";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!company?.id) {
      setError("Selecione uma empresa ativa.");
      return;
    }

    if (!actionAllowed) {
      setError(
        mode === "create"
          ? "Você não tem permissão para criar lançamentos."
          : "Você não tem permissão para editar lançamentos."
      );
      return;
    }

    if (!validate()) {
      setError("Preencha os campos obrigatórios corretamente.");
      return;
    }

    setLoading(true);

    const isPayable = form.entry_type === FINANCIAL_ENTRY_TYPES.payable;
    const selectedCustomer = customers.find((item) => item.id === form.customer_id);
    const selectedSupplier = suppliers.find((item) => item.id === form.supplier_id);

    const payload: FinancialEntryInsert = {
      company_id: company.id,
      entry_type: form.entry_type,
      description: form.description.trim(),
      category: form.category.trim() || null,
      customer_id: isPayable ? null : form.customer_id || null,
      supplier_id: isPayable ? form.supplier_id || null : null,
      party_name:
        form.party_name.trim() ||
        (isPayable
          ? selectedSupplier?.full_name
          : selectedCustomer?.full_name) ||
        null,
      amount: parseCurrencyInput(form.amount),
      issue_date: form.issue_date,
      due_date: form.due_date,
      payment_date: form.payment_date || null,
      status: form.status || FINANCIAL_STATUS.pending,
      payment_method: form.payment_method || null,
      document_number: form.document_number.trim() || null,
      notes: form.notes.trim() || null,
      is_recurring: form.is_recurring === "yes",
      ...(mode === "create" ? { source_type: "manual" } : {}),
    };

    try {
      const result =
        mode === "create"
          ? await createFinancialEntry(payload)
          : await updateFinancialEntry(company.id, entry!.id, payload);

      if (result.error || !result.data) {
        setError(
          result.error?.message ?? "Não foi possível salvar o lançamento."
        );
        return;
      }

      setSuccess(
        mode === "create"
          ? "Lançamento criado com sucesso."
          : "Lançamento atualizado com sucesso."
      );
      router.push(financeDetailPath(result.data.id));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro inesperado ao salvar o lançamento."
      );
    } finally {
      setLoading(false);
    }
  }

  const partyLabel =
    form.entry_type === FINANCIAL_ENTRY_TYPES.payable
      ? "Fornecedor"
      : "Cliente";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!actionAllowed ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {mode === "create"
            ? "Você não tem permissão para criar lançamentos financeiros."
            : "Você não tem permissão para editar lançamentos financeiros."}
        </div>
      ) : null}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-primary/10 p-3 text-sm text-foreground">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados do lançamento</CardTitle>
          <CardDescription>
            Contas a pagar ou a receber da empresa ativa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entry_type">Tipo *</Label>
              <Select
                id="entry_type"
                value={form.entry_type}
                onChange={(e) => {
                  const nextType = e.target.value as FinancialEntryType;
                  updateField("entry_type", nextType);
                  if (nextType === FINANCIAL_ENTRY_TYPES.payable) {
                    updateField("customer_id", "");
                  } else {
                    updateField("supplier_id", "");
                  }
                }}
              >
                {FINANCIAL_ENTRY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                id="status"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                {FINANCIAL_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.description} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                id="category"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                <option value="">Selecione</option>
                {FINANCIAL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                value={form.amount}
                onChange={(e) =>
                  updateField("amount", formatCurrencyInput(e.target.value))
                }
                placeholder="0,00"
                required
              />
              <FieldError message={fieldErrors.amount} />
            </div>
            {form.entry_type === FINANCIAL_ENTRY_TYPES.payable ? (
              <div className="space-y-2">
                <Label htmlFor="supplier_id">Fornecedor (cadastro)</Label>
                <Select
                  id="supplier_id"
                  value={form.supplier_id}
                  onChange={(e) => {
                    const supplierId = e.target.value;
                    updateField("supplier_id", supplierId);
                    const selected = suppliers.find(
                      (item) => item.id === supplierId
                    );
                    if (selected) {
                      updateField("party_name", selected.full_name);
                    }
                  }}
                >
                  <option value="">Nenhum</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.full_name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="customer_id">Cliente (cadastro)</Label>
                <Select
                  id="customer_id"
                  value={form.customer_id}
                  onChange={(e) => {
                    const customerId = e.target.value;
                    updateField("customer_id", customerId);
                    const selected = customers.find(
                      (item) => item.id === customerId
                    );
                    if (selected) {
                      updateField("party_name", selected.full_name);
                    }
                  }}
                >
                  <option value="">Nenhum</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="party_name">{partyLabel}</Label>
              <Input
                id="party_name"
                value={form.party_name}
                onChange={(e) => updateField("party_name", e.target.value)}
                placeholder={
                  form.entry_type === FINANCIAL_ENTRY_TYPES.payable
                    ? "Nome do fornecedor"
                    : "Nome do cliente"
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue_date">Data de emissão *</Label>
              <Input
                id="issue_date"
                type="date"
                value={form.issue_date}
                onChange={(e) => updateField("issue_date", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.issue_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Data de vencimento *</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => updateField("due_date", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.due_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_date">
                Data de pagamento/recebimento
              </Label>
              <Input
                id="payment_date"
                type="date"
                value={form.payment_date}
                onChange={(e) => updateField("payment_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Forma de pagamento</Label>
              <Select
                id="payment_method"
                value={form.payment_method}
                onChange={(e) => updateField("payment_method", e.target.value)}
              >
                <option value="">Selecione</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_number">Número do documento</Label>
              <Input
                id="document_number"
                value={form.document_number}
                onChange={(e) =>
                  updateField("document_number", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_recurring">Recorrente</Label>
              <Select
                id="is_recurring"
                value={form.is_recurring}
                onChange={(e) => updateField("is_recurring", e.target.value)}
              >
                <option value="no">Não</option>
                <option value="yes">Sim</option>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push(
                entry ? financeDetailPath(entry.id) : ROUTES.finance
              )
            }
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !actionAllowed}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading
              ? "Salvando..."
              : mode === "create"
                ? "Criar lançamento"
                : "Salvar alterações"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
