"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ROUTES,
  TASK_STATUS,
  taskEditPath,
} from "@/lib/constants";
import {
  cancelTask,
  completeTask,
  deleteTask,
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
import { cn } from "@/lib/utils";

type TaskDetailProps = {
  task: TaskWithRelations;
  companyId: string;
};

function InfoItem({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-medium break-words", className)}>
        {value || "—"}
      </p>
    </div>
  );
}

export function TaskDetail({ task, companyId }: TaskDetailProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(task);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overdue = isTaskOverdue({
    dueDate: current.due_date,
    status: current.status,
  });
  const time = formatTaskTime(current.due_time);

  async function runStatusAction(action: "complete" | "reopen" | "cancel") {
    setLoading(true);
    setError(null);

    const result =
      action === "complete"
        ? await completeTask(companyId, current.id)
        : action === "reopen"
          ? await reopenTask(companyId, current.id)
          : await cancelTask(companyId, current.id);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível atualizar a tarefa.");
      setLoading(false);
      return;
    }

    setCurrent(result.data);
    setLoading(false);
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const result = await deleteTask(companyId, current.id);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push(ROUTES.tasks);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className={cn(overdue && "border-red-200")}>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className={cn(overdue && "text-red-700")}>
              {current.title}
            </CardTitle>
            <CardDescription>
              {taskStatusLabel(current.status)} ·{" "}
              {taskPriorityLabel(current.priority)}
              {overdue ? " · Atrasada" : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={taskEditPath(current.id)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
            {current.status !== TASK_STATUS.completed &&
            current.status !== TASK_STATUS.cancelled ? (
              <Button
                type="button"
                disabled={loading}
                onClick={() => void runStatusAction("complete")}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Concluir
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void runStatusAction("reopen")}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Reabrir
              </Button>
            )}
            {current.status !== TASK_STATUS.cancelled &&
            current.status !== TASK_STATUS.completed ? (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void runStatusAction("cancel")}
              >
                <XCircle className="h-4 w-4" />
                Cancelar
              </Button>
            ) : null}
            {!confirmingDelete ? (
              <Button
                variant="destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            ) : (
              <>
                <Button
                  variant="destructive"
                  disabled={loading}
                  onClick={() => void handleDelete()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Confirmar exclusão
                </Button>
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Voltar
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <InfoItem label="Data" value={formatTaskDate(current.due_date)} />
          <InfoItem label="Horário" value={time} />
          <InfoItem
            label="Status"
            value={taskStatusLabel(current.status)}
            className={taskStatusTone(current.status)}
          />
          <InfoItem
            label="Prioridade"
            value={taskPriorityLabel(current.priority)}
            className={taskPriorityTone(current.priority)}
          />
          <InfoItem
            label="Responsável"
            value={current.assigned_user?.full_name}
          />
          <InfoItem
            label="Cliente relacionado"
            value={
              current.related_customer?.trade_name ||
              current.related_customer?.full_name
            }
          />
          <InfoItem
            label="Criado por"
            value={current.created_by_user?.full_name}
          />
          <InfoItem
            label="Concluída em"
            value={
              current.completed_at
                ? new Date(current.completed_at).toLocaleString("pt-BR")
                : null
            }
          />
          <div className="sm:col-span-2">
            <InfoItem label="Descrição" value={current.description} />
          </div>
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href={ROUTES.tasks}>Voltar para tarefas</Link>
      </Button>
    </div>
  );
}
