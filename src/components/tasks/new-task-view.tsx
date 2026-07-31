"use client";

import { TaskForm } from "@/components/tasks/task-form";
import { TaskPageShell } from "@/components/tasks/task-page-shell";

export function NewTaskView() {
  return (
    <TaskPageShell
      title="Nova tarefa"
      description="Cadastre uma tarefa vinculada à empresa ativa"
    >
      {(companyId) => <TaskForm companyId={companyId} mode="create" />}
    </TaskPageShell>
  );
}
