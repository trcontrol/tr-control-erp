"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  XCircle,
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
  ROUTES,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS,
  TASK_STATUS_OPTIONS,
  taskDetailPath,
  taskEditPath,
} from "@/lib/constants";
import {
  cancelTask,
  completeTask,
  listTasks,
  reopenTask,
  type TaskWithRelations,
} from "@/lib/tasks/actions";
import {
  formatTaskDate,
  formatTaskTime,
  isTaskOverdue,
  taskPriorityLabel,
  taskPriorityTone,
  taskStatusLabel,
  taskStatusTone,
} from "@/lib/tasks/format";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";

export function TasksList() {
  const { company } = useTenant();
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (active) {
        setCurrentUserId(user?.id ?? null);
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  const loadTasks = useCallback(async () => {
    if (!company?.id) {
      setTasks([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar tarefas.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listTasks({
      companyId: company.id,
      search,
      status,
      priority,
      periodFrom: periodFrom || undefined,
      periodTo: periodTo || undefined,
      assignedToMe: onlyMine,
      currentUserId,
    });

    if (result.error) {
      setTasks([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setTasks(result.data);
    setLoading(false);
  }, [
    company?.id,
    search,
    status,
    priority,
    periodFrom,
    periodTo,
    onlyMine,
    currentUserId,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadTasks();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadTasks]);

  async function runAction(
    taskId: string,
    action: "complete" | "reopen" | "cancel"
  ) {
    if (!company?.id) return;

    setActionLoadingId(taskId);
    setError(null);

    const result =
      action === "complete"
        ? await completeTask(company.id, taskId)
        : action === "reopen"
          ? await reopenTask(company.id, taskId)
          : await cancelTask(company.id, taskId);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível atualizar a tarefa.");
      setActionLoadingId(null);
      return;
    }

    setTasks((current) =>
      current.map((task) => (task.id === taskId ? result.data! : task))
    );
    setActionLoadingId(null);
  }

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa ativa</CardTitle>
          <CardDescription>
            Selecione ou cadastre uma empresa para gerenciar tarefas.
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
            placeholder="Buscar por título ou descrição"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button asChild>
          <Link href={ROUTES.tasksNew}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos os status</option>
          {TASK_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="all">Todas as prioridades</option>
          {TASK_PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
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
        <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--brand-coral)]"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
          />
          Somente minhas
        </label>
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
            Carregando tarefas...
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ListTodo className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Nenhuma tarefa encontrada</CardTitle>
            <CardDescription>
              Crie a primeira tarefa da empresa {company.name} ou ajuste os
              filtros.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button asChild>
              <Link href={ROUTES.tasksNew}>
                <Plus className="h-4 w-4" />
                Nova tarefa
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
                  <th className="px-4 py-3 font-medium">Tarefa</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Prioridade</th>
                  <th className="px-4 py-3 font-medium">Responsável</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const overdue = isTaskOverdue({
                    dueDate: task.due_date,
                    status: task.status,
                  });
                  const time = formatTaskTime(task.due_time);
                  const busy = actionLoadingId === task.id;

                  return (
                    <tr
                      key={task.id}
                      className={cn(
                        "border-t",
                        overdue && "bg-red-50/70"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div
                          className={cn(
                            "font-medium",
                            overdue && "text-red-700"
                          )}
                        >
                          {task.title}
                        </div>
                        {overdue ? (
                          <div className="text-xs text-red-600">Atrasada</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div>{formatTaskDate(task.due_date)}</div>
                        {time ? (
                          <div className="text-xs text-muted-foreground">
                            {time}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={taskStatusTone(task.status)}>
                          {taskStatusLabel(task.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={taskPriorityTone(task.priority)}>
                          {taskPriorityLabel(task.priority)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {task.assigned_user?.full_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {task.related_customer?.trade_name ||
                          task.related_customer?.full_name ||
                          "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon">
                            <Link href={taskDetailPath(task.id)}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="icon">
                            <Link href={taskEditPath(task.id)}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          {task.status !== TASK_STATUS.completed &&
                          task.status !== TASK_STATUS.cancelled ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={busy}
                              onClick={() => void runAction(task.id, "complete")}
                              title="Concluir"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              )}
                            </Button>
                          ) : null}
                          {task.status === TASK_STATUS.completed ||
                          task.status === TASK_STATUS.cancelled ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={busy}
                              onClick={() => void runAction(task.id, "reopen")}
                              title="Reabrir"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                            </Button>
                          ) : null}
                          {task.status !== TASK_STATUS.cancelled &&
                          task.status !== TASK_STATUS.completed ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={busy}
                              onClick={() => void runAction(task.id, "cancel")}
                              title="Cancelar"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {tasks.map((task) => {
              const overdue = isTaskOverdue({
                dueDate: task.due_date,
                status: task.status,
              });
              const time = formatTaskTime(task.due_time);
              const busy = actionLoadingId === task.id;

              return (
                <Card
                  key={task.id}
                  className={cn(overdue && "border-red-200 bg-red-50/50")}
                >
                  <CardHeader className="pb-3">
                    <CardTitle
                      className={cn(
                        "text-base",
                        overdue && "text-red-700"
                      )}
                    >
                      {task.title}
                    </CardTitle>
                    <CardDescription>
                      {formatTaskDate(task.due_date)}
                      {time ? ` · ${time}` : ""}
                      {overdue ? " · Atrasada" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className={taskStatusTone(task.status)}>
                          {taskStatusLabel(task.status)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Prioridade</p>
                        <p className={taskPriorityTone(task.priority)}>
                          {taskPriorityLabel(task.priority)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Responsável</p>
                        <p>{task.assigned_user?.full_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cliente</p>
                        <p>
                          {task.related_customer?.trade_name ||
                            task.related_customer?.full_name ||
                            "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" className="flex-1">
                        <Link href={taskDetailPath(task.id)}>Ver</Link>
                      </Button>
                      <Button asChild className="flex-1">
                        <Link href={taskEditPath(task.id)}>Editar</Link>
                      </Button>
                      {task.status !== TASK_STATUS.completed &&
                      task.status !== TASK_STATUS.cancelled ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          disabled={busy}
                          onClick={() => void runAction(task.id, "complete")}
                        >
                          Concluir
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          disabled={busy}
                          onClick={() => void runAction(task.id, "reopen")}
                        >
                          Reabrir
                        </Button>
                      )}
                      {task.status !== TASK_STATUS.cancelled &&
                      task.status !== TASK_STATUS.completed ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="flex-1"
                          disabled={busy}
                          onClick={() => void runAction(task.id, "cancel")}
                        >
                          Cancelar
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
