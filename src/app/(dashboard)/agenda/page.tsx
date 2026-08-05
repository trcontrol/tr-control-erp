import { AgendaList } from "@/components/agenda/agenda-list";

export const metadata = {
  title: "Agenda",
};

export default function AgendaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
        <p className="text-muted-foreground">
          Organize compromissos, reuniões e agendamentos da empresa ativa
        </p>
      </div>
      <AgendaList />
    </div>
  );
}
