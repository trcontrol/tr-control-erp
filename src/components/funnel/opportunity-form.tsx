"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  OPPORTUNITY_STAGE_OPTIONS,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_STATUS_OPTIONS,
  ROUTES,
  opportunityDetailPath,
} from "@/lib/constants";
import { listCustomers } from "@/lib/customers/actions";
import {
  createOpportunity,
  updateOpportunity,
  type OpportunityWithRelations,
} from "@/lib/funnel/actions";
import {
  formatOpportunityCurrencyInput,
  parseOpportunityCurrencyInput,
  toOpportunityAmount,
} from "@/lib/funnel/format";
import {
  listCompanyMemberOptions,
  type CompanyMemberOption,
} from "@/lib/tasks/actions";
import type { Customer } from "@/types/database";

type OpportunityFormState = {
  customer_id: string;
  title: string;
  estimated_value: string;
  stage: string;
  assigned_user_id: string;
  next_action_date: string;
  notes: string;
  status: string;
};

type OpportunityFormProps = {
  companyId: string;
  opportunity?: OpportunityWithRelations;
  mode: "create" | "edit";
};

function toFormState(opportunity?: OpportunityWithRelations): OpportunityFormState {
  const amount = opportunity
    ? toOpportunityAmount(opportunity.estimated_value)
    : 0;

  return {
    customer_id: opportunity?.customer_id ?? "",
    title: opportunity?.title ?? "",
    estimated_value:
      amount > 0
        ? amount.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "",
    stage: opportunity?.stage ?? OPPORTUNITY_STAGES.new_lead,
    assigned_user_id: opportunity?.assigned_user_id ?? "",
    next_action_date: opportunity?.next_action_date ?? "",
    notes: opportunity?.notes ?? "",
    status: opportunity?.status ?? OPPORTUNITY_STATUS.active,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function OpportunityForm({
  companyId,
  opportunity,
  mode,
}: OpportunityFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<OpportunityFormState>(() =>
    toFormState(opportunity)
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof OpportunityFormState, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<CompanyMemberOption[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setLoadingOptions(true);
      const [membersResult, customersResult] = await Promise.all([
        listCompanyMemberOptions(companyId),
        listCustomers({ companyId, status: "active" }),
      ]);

      if (!active) return;

      if (membersResult.data) {
        setMembers(membersResult.data);
      }
      if (customersResult.data) {
        setCustomers(customersResult.data);
      }
      setLoadingOptions(false);
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, [companyId]);

  function updateField<K extends keyof OpportunityFormState>(
    key: K,
    value: OpportunityFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSuccess(null);
  }

  function validate() {
    const nextErrors: Partial<Record<keyof OpportunityFormState, string>> = {};

    if (!form.customer_id) {
      nextErrors.customer_id = "Campo obrigatório";
    }

    if (!form.title.trim()) {
      nextErrors.title = "Campo obrigatório";
    }

    if (form.estimated_value.trim()) {
      const amount = parseOpportunityCurrencyInput(form.estimated_value);
      if (!Number.isFinite(amount) || amount < 0) {
        nextErrors.estimated_value = "Valor inválido";
      }
    }

    if (!OPPORTUNITY_STAGE_OPTIONS.some((item) => item.value === form.stage)) {
      nextErrors.stage = "Etapa inválida";
    }

    if (!OPPORTUNITY_STATUS_OPTIONS.some((item) => item.value === form.status)) {
      nextErrors.status = "Status inválido";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validate()) {
      setError("Preencha os campos obrigatórios corretamente.");
      return;
    }

    setLoading(true);

    const estimatedValue = form.estimated_value.trim()
      ? parseOpportunityCurrencyInput(form.estimated_value)
      : 0;

    const payload = {
      customerId: form.customer_id,
      title: form.title,
      estimatedValue,
      stage: form.stage,
      assignedUserId: form.assigned_user_id || null,
      nextActionDate: form.next_action_date || null,
      notes: form.notes,
      status: form.status,
    };

    const result =
      mode === "create"
        ? await createOpportunity({ companyId, ...payload })
        : await updateOpportunity(companyId, opportunity!.id, payload);

    if (result.error || !result.data) {
      setError(
        result.error?.message ?? "Não foi possível salvar a oportunidade."
      );
      setLoading(false);
      return;
    }

    setSuccess(
      mode === "create"
        ? "Oportunidade criada com sucesso."
        : "Oportunidade atualizada com sucesso."
    );
    setLoading(false);
    router.push(opportunityDetailPath(result.data.id));
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Nova oportunidade" : "Editar oportunidade"}
          </CardTitle>
          <CardDescription>
            Preencha os dados da oportunidade da empresa ativa.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
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

          <div className="space-y-2">
            <Label htmlFor="customer_id">Cliente *</Label>
            <Select
              id="customer_id"
              value={form.customer_id}
              onChange={(e) => updateField("customer_id", e.target.value)}
              disabled={loadingOptions}
            >
              <option value="">Selecione um cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.trade_name || customer.full_name}
                </option>
              ))}
            </Select>
            <FieldError message={fieldErrors.customer_id} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título da oportunidade *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Ex.: Implantação do sistema"
            />
            <FieldError message={fieldErrors.title} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimated_value">Valor estimado</Label>
              <Input
                id="estimated_value"
                value={form.estimated_value}
                onChange={(e) =>
                  updateField(
                    "estimated_value",
                    formatOpportunityCurrencyInput(e.target.value)
                  )
                }
                placeholder="0,00"
                inputMode="decimal"
              />
              <FieldError message={fieldErrors.estimated_value} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Etapa</Label>
              <Select
                id="stage"
                value={form.stage}
                onChange={(e) => updateField("stage", e.target.value)}
              >
                {OPPORTUNITY_STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.stage} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assigned_user_id">Responsável</Label>
              <Select
                id="assigned_user_id"
                value={form.assigned_user_id}
                onChange={(e) =>
                  updateField("assigned_user_id", e.target.value)
                }
                disabled={loadingOptions}
              >
                <option value="">Sem responsável</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name || "Usuário sem nome"}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_action_date">Data da próxima ação</Label>
              <Input
                id="next_action_date"
                type="date"
                value={form.next_action_date}
                onChange={(e) =>
                  updateField("next_action_date", e.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
            >
              {OPPORTUNITY_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <FieldError message={fieldErrors.status} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Detalhes da negociação, próximos passos..."
              rows={4}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar oportunidade
          </Button>
          <Button asChild type="button" variant="outline">
            <Link
              href={
                mode === "edit" && opportunity?.id
                  ? opportunityDetailPath(opportunity.id)
                  : ROUTES.funnel
              }
            >
              Cancelar
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
