import { TasksList } from "@/components/tasks/tasks-list";

export const metadata = {
  title: "Tarefas",
};

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
        <p className="text-muted-foreground">
          Organize pendências e acompanhe a rotina da empresa ativa
        </p>
      </div>
      <TasksList />
    </div>
  );
}
