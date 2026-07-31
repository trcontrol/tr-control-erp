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
  ROUTES,
  TASK_PRIORITY,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS,
  TASK_STATUS_OPTIONS,
  taskDetailPath,
} from "@/lib/constants";
import { listCustomers } from "@/lib/customers/actions";
import {
  createTask,
  listCompanyMemberOptions,
  updateTask,
  type CompanyMemberOption,
  type TaskWithRelations,
} from "@/lib/tasks/actions";
import { formatTaskTime } from "@/lib/tasks/format";
import type { Customer } from "@/types/database";

type TaskFormState = {
  title: string;
  description: string;
  due_date: string;
  due_time: string;
  priority: string;
  status: string;
  assigned_user_id: string;
  related_customer_id: string;
};

type TaskFormProps = {
  companyId: string;
  task?: TaskWithRelations;
  mode: "create" | "edit";
};

function toFormState(task?: TaskWithRelations): TaskFormState {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    due_date: task?.due_date ?? "",
    due_time: formatTaskTime(task?.due_time) ?? "",
    priority: task?.priority ?? TASK_PRIORITY.medium,
    status: task?.status ?? TASK_STATUS.pending,
    assigned_user_id: task?.assigned_user_id ?? "",
    related_customer_id: task?.related_customer_id ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function TaskForm({ companyId, task, mode }: TaskFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<TaskFormState>(() => toFormState(task));
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof TaskFormState, string>>
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

  function updateField<K extends keyof TaskFormState>(
    key: K,
    value: TaskFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSuccess(null);
  }

  function validate() {
    const nextErrors: Partial<Record<keyof TaskFormState, string>> = {};

    if (!form.title.trim()) {
      nextErrors.title = "Campo obrigatório";
    }

    if (!form.due_date) {
      nextErrors.due_date = "Campo obrigatório";
    }

    if (form.due_time && !/^\d{2}:\d{2}$/.test(form.due_time)) {
      nextErrors.due_time = "Horário inválido";
    }

    if (!TASK_PRIORITY_OPTIONS.some((item) => item.value === form.priority)) {
      nextErrors.priority = "Prioridade inválida";
    }

    if (!TASK_STATUS_OPTIONS.some((item) => item.value === form.status)) {
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

    const payload = {
      title: form.title,
      description: form.description,
      dueDate: form.due_date,
      dueTime: form.due_time || null,
      priority: form.priority,
      status: form.status,
      assignedUserId: form.assigned_user_id || null,
      relatedCustomerId: form.related_customer_id || null,
    };

    const result =
      mode === "create"
        ? await createTask({ companyId, ...payload })
        : await updateTask(companyId, task!.id, payload);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível salvar a tarefa.");
      setLoading(false);
      return;
    }

    setSuccess(
      mode === "create"
        ? "Tarefa criada com sucesso."
        : "Tarefa atualizada com sucesso."
    );
    setLoading(false);
    router.push(taskDetailPath(result.data.id));
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Nova tarefa" : "Editar tarefa"}
          </CardTitle>
          <CardDescription>
            Preencha os dados da tarefa da empresa ativa.
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
              placeholder="Ex.: Ligar para o cliente"
            />
            <FieldError message={fieldErrors.title} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Detalhes opcionais da tarefa"
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due_date">Data *</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => updateField("due_date", e.target.value)}
              />
              <FieldError message={fieldErrors.due_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_time">Horário</Label>
              <Input
                id="due_time"
                type="time"
                value={form.due_time}
                onChange={(e) => updateField("due_time", e.target.value)}
              />
              <FieldError message={fieldErrors.due_time} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                id="priority"
                value={form.priority}
                onChange={(e) => updateField("priority", e.target.value)}
              >
                {TASK_PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.priority} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                {TASK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.status} />
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
            Salvar tarefa
          </Button>
          <Button asChild type="button" variant="outline">
            <Link
              href={
                mode === "edit" && task?.id
                  ? taskDetailPath(task.id)
                  : ROUTES.tasks
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
