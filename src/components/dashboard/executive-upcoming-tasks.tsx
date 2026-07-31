"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { DashboardSectionLink } from "@/components/dashboard/dashboard-section-link";
import { ROUTES, taskDetailPath } from "@/lib/constants";
import {
  completeTask,
  listUpcomingTasks,
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
import { cn } from "@/lib/utils";

type ExecutiveUpcomingTasksProps = {
  companyId: string;
};

export function ExecutiveUpcomingTasks({
  companyId,
}: ExecutiveUpcomingTasksProps) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadTasks = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const result = await listUpcomingTasks(companyId, 5);

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (result.error || !result.data) {
      setTasks([]);
      setError(result.error?.message ?? "Erro ao carregar tarefas.");
      setLoading(false);
      return;
    }

    setTasks(result.data);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function handleComplete(taskId: string) {
    setCompletingId(taskId);
    setError(null);

    const result = await completeTask(companyId, taskId);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível concluir a tarefa.");
      setCompletingId(null);
      return;
    }

    setTasks((current) => current.filter((task) => task.id !== taskId));
    setCompletingId(null);
  }

  return (
    <DashboardSectionCard
      title="Próximas tarefas"
      elevation="secondary"
      className="min-w-0"
      action={
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">
          <DashboardSectionLink href={ROUTES.tasksNew}>
            Nova tarefa
          </DashboardSectionLink>
          <DashboardSectionLink href={ROUTES.tasks}>
            Ver todas
          </DashboardSectionLink>
        </div>
      }
    >
      {error ? (
        <div className="mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-coral)]" />
          Carregando tarefas...
        </div>
      ) : !tasks.length ? (
        <div className="space-y-4 py-6 text-center">
          <div>
            <p className="text-sm font-medium text-[var(--brand-navy)]">
              Nenhuma tarefa próxima.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize sua rotina criando uma nova tarefa.
            </p>
          </div>
          <Button asChild size="sm" className="rounded-full">
            <Link href={ROUTES.tasksNew}>
              <Plus className="h-4 w-4" />
              Nova tarefa
            </Link>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-[var(--brand-navy)]/[0.045]">
          {tasks.map((task) => {
            const overdue = isTaskOverdue({
              dueDate: task.due_date,
              status: task.status,
            });
            const time = formatTaskTime(task.due_time);
            const busy = completingId === task.id;

            return (
              <div
                key={task.id}
                className="flex items-start justify-between gap-3 py-3.5 first:pt-1 last:pb-1"
              >
                <Link
                  href={taskDetailPath(task.id)}
                  className="min-w-0 flex-1 rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40"
                >
                  <p
                    className={cn(
                      "truncate text-[13px] font-semibold text-[var(--brand-navy)]",
                      overdue && "text-red-700"
                    )}
                  >
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {formatTaskDate(task.due_date)}
                    {time ? ` · ${time}` : ""}
                    {overdue ? " · Atrasada" : ""}
                  </p>
                  <p className="mt-1 text-[11px]">
                    <span className={taskPriorityTone(task.priority)}>
                      {taskPriorityLabel(task.priority)}
                    </span>
                    <span className="text-muted-foreground"> · </span>
                    <span className={taskStatusTone(task.status)}>
                      {taskStatusLabel(task.status)}
                    </span>
                  </p>
                </Link>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  disabled={busy}
                  onClick={() => void handleComplete(task.id)}
                  title="Concluir tarefa"
                  aria-label={`Concluir tarefa ${task.title}`}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </DashboardSectionCard>
  );
}
