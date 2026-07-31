"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TaskDetail } from "@/components/tasks/task-detail";
import { TaskPageShell } from "@/components/tasks/task-page-shell";
import { getTask, type TaskWithRelations } from "@/lib/tasks/actions";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <TaskPageShell
      title="Detalhes da tarefa"
      description="Visualização completa da tarefa"
    >
      {(companyId) => (
        <TaskDetailLoader companyId={companyId} taskId={params.id} />
      )}
    </TaskPageShell>
  );
}

function TaskDetailLoader({
  companyId,
  taskId,
}: {
  companyId: string;
  taskId: string;
}) {
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await getTask(companyId, taskId);

      if (!active) return;

      if (result.error || !result.data) {
        setTask(null);
        setError(result.error?.message ?? "Tarefa não encontrada.");
        setLoading(false);
        return;
      }

      setTask(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [companyId, taskId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando tarefa...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error ?? "Tarefa não encontrada."}
      </div>
    );
  }

  return <TaskDetail task={task} companyId={companyId} />;
}
