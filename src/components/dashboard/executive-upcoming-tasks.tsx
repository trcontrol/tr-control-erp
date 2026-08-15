"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Circle, Loader2, Plus } from "lucide-react";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { DashboardSectionLink } from "@/components/dashboard/dashboard-section-link";
import {
  ROUTES,
  TASK_PRIORITY,
  TASK_STATUS,
  taskDetailPath,
} from "@/lib/constants";
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
  taskStatusLabel,
} from "@/lib/tasks/format";
import { cn } from "@/lib/utils";
import { useTenant } from "@/providers/tenant-provider";
import { PERMISSION_MODULES } from "@/lib/users/permissions";

type ExecutiveUpcomingTasksProps = {
  companyId: string;
};

function priorityBadgeClass(priority: string) {
  if (priority === TASK_PRIORITY.urgent) {
    return "border border-red-300/70 bg-red-50 text-red-700";
  }
  if (priority === TASK_PRIORITY.high) {
    return "border border-[var(--brand-coral)]/45 bg-[var(--brand-coral)]/[0.18] text-[var(--brand-navy)]";
  }
  if (priority === TASK_PRIORITY.low) {
    return "border border-[var(--brand-navy)]/15 bg-white text-[var(--brand-navy)]/70";
  }
  return "border border-[var(--brand-gold)]/45 bg-[var(--brand-gold)]/[0.18] text-[var(--brand-navy)]";
}

function statusBadgeClass(status: string) {
  if (status === TASK_STATUS.completed) {
    return "border border-emerald-300/70 bg-emerald-50 text-emerald-800";
  }
  if (status === TASK_STATUS.in_progress) {
    return "border border-[var(--brand-gold)]/40 bg-[var(--brand-gold)]/[0.16] text-[var(--brand-navy)]";
  }
  if (status === TASK_STATUS.cancelled) {
    return "border border-[var(--brand-navy)]/12 bg-[var(--brand-surface)] text-[var(--brand-navy)]/55";
  }
  return "border border-[var(--brand-navy)]/15 bg-white text-[var(--brand-navy)]/75";
}

function TaskBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em]",
        className
      )}
    >
      {label}
    </span>
  );
}

const miniCardClass = cn(
  "min-h-[96px] min-w-0 rounded-2xl border border-[var(--brand-gold)]/22 bg-[#fdfdfd] px-3.5 py-3 sm:min-h-[108px] sm:px-4 sm:py-3.5",
  "shadow-[0_3px_10px_rgb(11_31_58/0.05)]",
  "transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out"
);

export function ExecutiveUpcomingTasks({
  companyId,
}: ExecutiveUpcomingTasksProps) {
  const { creatableModules } = useTenant();
  const canCreate = creatableModules.includes(PERMISSION_MODULES.tasks);
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
      accent="purple"
      elevation="secondary"
      className={cn(
        "relative h-full w-full min-w-0 overflow-hidden",
        "border border-[#7b6aae]/28 bg-[linear-gradient(180deg,#ffffff_0%,#f8f6fc_100%)]",
        "shadow-[0_4px_14px_rgb(123_106_174/0.08),0_14px_30px_rgb(17_32_59/0.05)]",
        "hover:border-[#7b6aae]/45"
      )}
      headerClassName="items-start gap-2 px-3.5 pb-2 pt-3 sm:items-center sm:gap-3 sm:px-5 sm:pb-2.5 sm:pt-3.5"
      titleClassName="text-[15px] font-bold tracking-[-0.02em] text-[#0f1b33] sm:text-[16px]"
      contentClassName="flex-none px-3.5 pb-3 pt-0.5 sm:px-5 sm:pb-3.5"
      action={
        <div className="flex max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
          {canCreate ? (
            <DashboardSectionLink
              href={ROUTES.tasksNew}
              className="rounded-full bg-[var(--brand-coral)] px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_2px_8px_rgb(196_147_159/0.35)] transition-all duration-200 hover:bg-[var(--brand-coral)]/90 hover:text-white hover:shadow-[0_4px_12px_rgb(196_147_159/0.4)] sm:px-3.5 sm:text-[12.5px]"
            >
              Nova tarefa
            </DashboardSectionLink>
          ) : null}
          <DashboardSectionLink
            href={ROUTES.tasks}
            className="rounded-full border border-[var(--brand-gold)]/55 bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--brand-navy)]/75 shadow-[0_1px_3px_rgb(11_31_58/0.04)] transition-all duration-200 hover:border-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/[0.06] hover:text-[var(--brand-navy)] sm:px-3.5 sm:text-[12.5px]"
          >
            Ver todas
          </DashboardSectionLink>
        </div>
      }
    >
      {error ? (
        <div className="mb-3 rounded-xl border border-[var(--brand-coral)]/25 bg-[var(--brand-coral)]/[0.08] px-3 py-2 text-[13px] text-[var(--brand-navy)]/80">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className={miniCardClass}>
              <div className="h-4 w-3/5 animate-pulse rounded bg-[var(--brand-navy)]/[0.07]" />
              <div className="mt-2.5 h-2.5 w-2/5 animate-pulse rounded bg-[var(--brand-navy)]/[0.05]" />
              <div className="mt-3 flex gap-1.5">
                <div className="h-5 w-14 animate-pulse rounded-full bg-[var(--brand-gold)]/15" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--brand-navy)]/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      ) : !tasks.length ? (
        <div
          className={cn(
            miniCardClass,
            "flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
          )}
        >
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--brand-navy)]">
              Nenhuma tarefa próxima.
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--brand-navy)]/50">
              Organize sua rotina criando uma nova tarefa.
            </p>
          </div>
          {canCreate ? (
            <DashboardSectionLink
              href={ROUTES.tasksNew}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-coral)] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors duration-200 hover:bg-[var(--brand-coral)]/90 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar tarefa
            </DashboardSectionLink>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2",
            tasks.length === 1 && "sm:grid-cols-1"
          )}
        >
          {tasks.map((task) => {
            const overdue = isTaskOverdue({
              dueDate: task.due_date,
              status: task.status,
            });
            const time = formatTaskTime(task.due_time);
            const busy = completingId === task.id;
            const dueLine = [formatTaskDate(task.due_date), time]
              .filter(Boolean)
              .join(" • ");
            const detailHref = taskDetailPath(task.id);

            return (
              <div
                key={task.id}
                className={cn(
                  "group w-full",
                  miniCardClass,
                  "hover:-translate-y-0.5 hover:border-[var(--brand-gold)]/40 hover:bg-white hover:shadow-[0_8px_22px_rgb(11_31_58/0.09)]",
                  overdue &&
                    "border-l-[2.5px] border-l-[var(--brand-coral)] border-y-[var(--brand-gold)]/22 border-r-[var(--brand-gold)]/22 bg-[var(--brand-coral)]/[0.03]"
                )}
              >
                <div className="flex items-start gap-2">
                  <Link
                    href={detailHref}
                    className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/45"
                  >
                    <p
                      className={cn(
                        "line-clamp-2 text-left text-[14px] font-bold tracking-[-0.015em] leading-snug text-[var(--brand-navy)] sm:text-[15px]",
                        overdue && "text-[var(--brand-navy)]"
                      )}
                    >
                      {task.title}
                    </p>
                  </Link>

                  <button
                    type="button"
                    className={cn(
                      "-mr-0.5 -mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:-mr-1 sm:-mt-1 sm:h-9 sm:w-9",
                      "text-[var(--brand-gold)] transition-all duration-300 ease-out",
                      "hover:bg-[var(--brand-gold)]/14 hover:text-[var(--brand-gold-soft)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/45",
                      "disabled:pointer-events-none disabled:opacity-50"
                    )}
                    disabled={busy}
                    onClick={() => void handleComplete(task.id)}
                    title="Concluir tarefa"
                    aria-label={`Concluir tarefa ${task.title}`}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-coral)] sm:h-5 sm:w-5" />
                    ) : (
                      <Circle className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
                    )}
                  </button>
                </div>

                <Link
                  href={detailHref}
                  className="mt-2 block min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/45 sm:mt-2.5"
                >
                  <p
                    className={cn(
                      "truncate text-left text-[11.5px] text-[var(--brand-navy)]/48 sm:text-[12px]",
                      overdue && "text-[var(--brand-coral)]"
                    )}
                  >
                    {dueLine}
                  </p>
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 sm:mt-2.5">
                    <TaskBadge
                      label={taskPriorityLabel(task.priority)}
                      className={priorityBadgeClass(task.priority)}
                    />
                    <TaskBadge
                      label={taskStatusLabel(task.status)}
                      className={statusBadgeClass(task.status)}
                    />
                    {overdue ? (
                      <TaskBadge
                        label="Atrasada"
                        className="border border-[var(--brand-coral)]/50 bg-[var(--brand-coral)]/[0.2] text-[var(--brand-navy)]"
                      />
                    ) : null}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </DashboardSectionCard>
  );
}
