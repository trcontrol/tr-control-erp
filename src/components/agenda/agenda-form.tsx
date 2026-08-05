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
  AGENDA_STATUS,
  AGENDA_STATUS_OPTIONS,
  ROUTES,
  agendaDetailPath,
} from "@/lib/constants";
import { listCustomers } from "@/lib/customers/actions";
import {
  createAgendaEvent,
  updateAgendaEvent,
  type AgendaEventWithRelations,
} from "@/lib/agenda/actions";
import { formatAgendaTime } from "@/lib/agenda/format";
import {
  listCompanyMemberOptions,
  type CompanyMemberOption,
} from "@/lib/tasks/actions";
import type { Customer } from "@/types/database";

type AgendaFormState = {
  title: string;
  description: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  all_day: boolean;
  status: string;
  location: string;
  assigned_user_id: string;
  related_customer_id: string;
};

type AgendaFormProps = {
  companyId: string;
  event?: AgendaEventWithRelations;
  mode: "create" | "edit";
};

function toFormState(event?: AgendaEventWithRelations): AgendaFormState {
  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    start_date: event?.start_date ?? "",
    start_time: formatAgendaTime(event?.start_time) ?? "",
    end_date: event?.end_date ?? event?.start_date ?? "",
    end_time: formatAgendaTime(event?.end_time) ?? "",
    all_day: event?.all_day ?? false,
    status: event?.status ?? AGENDA_STATUS.scheduled,
    location: event?.location ?? "",
    assigned_user_id: event?.assigned_user_id ?? "",
    related_customer_id: event?.related_customer_id ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function AgendaForm({ companyId, event, mode }: AgendaFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<AgendaFormState>(() => toFormState(event));
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof AgendaFormState, string>>
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

  function updateField<K extends keyof AgendaFormState>(
    key: K,
    value: AgendaFormState[K]
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "start_date" && !current.end_date) {
        next.end_date = String(value);
      }
      if (key === "all_day" && value === true) {
        next.start_time = "";
        next.end_time = "";
      }
      return next;
    });
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSuccess(null);
  }

  function validate() {
    const nextErrors: Partial<Record<keyof AgendaFormState, string>> = {};

    if (!form.title.trim()) {
      nextErrors.title = "Campo obrigatório";
    }

    if (!form.start_date) {
      nextErrors.start_date = "Campo obrigatório";
    }

    if (!form.end_date) {
      nextErrors.end_date = "Campo obrigatório";
    }

    if (
      form.start_date &&
      form.end_date &&
      form.end_date < form.start_date
    ) {
      nextErrors.end_date =
        "A data final deve ser igual ou posterior à data inicial";
    }

    if (!form.all_day) {
      if (form.start_time && !/^\d{2}:\d{2}$/.test(form.start_time)) {
        nextErrors.start_time = "Horário inválido";
      }
      if (form.end_time && !/^\d{2}:\d{2}$/.test(form.end_time)) {
        nextErrors.end_time = "Horário inválido";
      }
    }

    if (!AGENDA_STATUS_OPTIONS.some((item) => item.value === form.status)) {
      nextErrors.status = "Status inválido";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(eventSubmit: React.FormEvent) {
    eventSubmit.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validate()) {
      setError("Preencha os campos obrigatórios corretamente.");
      return;
    }

    setLoading(true);

    const payload = {
      title: form.title,
      description: form.description,
      startDate: form.start_date,
      startTime: form.all_day ? null : form.start_time || null,
      endDate: form.end_date,
      endTime: form.all_day ? null : form.end_time || null,
      allDay: form.all_day,
      status: form.status,
      location: form.location,
      assignedUserId: form.assigned_user_id || null,
      relatedCustomerId: form.related_customer_id || null,
    };

    const result =
      mode === "create"
        ? await createAgendaEvent({ companyId, ...payload })
        : await updateAgendaEvent(companyId, event!.id, payload);

    if (result.error || !result.data) {
      setError(
        result.error?.message ?? "Não foi possível salvar o compromisso."
      );
      setLoading(false);
      return;
    }

    setSuccess(
      mode === "create"
        ? "Compromisso criado com sucesso."
        : "Compromisso atualizado com sucesso."
    );
    setLoading(false);
    router.push(agendaDetailPath(result.data.id));
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Novo compromisso" : "Editar compromisso"}
          </CardTitle>
          <CardDescription>
            Preencha os dados do compromisso da empresa ativa.
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
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Ex.: Reunião com cliente"
            />
            <FieldError message={fieldErrors.title} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Detalhes opcionais do compromisso"
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data inicial *</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => updateField("start_date", e.target.value)}
              />
              <FieldError message={fieldErrors.start_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_time">Horário inicial</Label>
              <Input
                id="start_time"
                type="time"
                value={form.start_time}
                onChange={(e) => updateField("start_time", e.target.value)}
                disabled={form.all_day}
              />
              <FieldError message={fieldErrors.start_time} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="end_date">Data final *</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => updateField("end_date", e.target.value)}
              />
              <FieldError message={fieldErrors.end_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Horário final</Label>
              <Input
                id="end_time"
                type="time"
                value={form.end_time}
                onChange={(e) => updateField("end_time", e.target.value)}
                disabled={form.all_day}
              />
              <FieldError message={fieldErrors.end_time} />
            </div>
          </div>

          <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--brand-coral)]"
              checked={form.all_day}
              onChange={(e) => updateField("all_day", e.target.checked)}
            />
            Dia inteiro
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                {AGENDA_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.status} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="Ex.: Sala de reuniões"
              />
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
              <Label htmlFor="related_customer_id">Cliente relacionado</Label>
              <Select
                id="related_customer_id"
                value={form.related_customer_id}
                onChange={(e) =>
                  updateField("related_customer_id", e.target.value)
                }
                disabled={loadingOptions}
              >
                <option value="">Nenhum cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.trade_name || customer.full_name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar compromisso
          </Button>
          <Button asChild type="button" variant="outline">
            <Link
              href={
                mode === "edit" && event?.id
                  ? agendaDetailPath(event.id)
                  : ROUTES.agenda
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
