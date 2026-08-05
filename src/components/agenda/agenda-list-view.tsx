"use client";

import Link from "next/link";
import { Calendar, Plus } from "lucide-react";
import { AgendaEventCard } from "@/components/agenda/agenda-event-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import type { AgendaEventWithRelations } from "@/lib/agenda/actions";
import {
  formatDayHeader,
  groupAgendaEventsByDate,
} from "@/lib/agenda/format";

type AgendaListViewProps = {
  events: AgendaEventWithRelations[];
  companyName: string;
  actionLoadingId: string | null;
  statusChangingId: string | null;
  onStatusChange: (event: AgendaEventWithRelations, status: string) => void;
  onDelete: (event: AgendaEventWithRelations) => void;
};

export function AgendaListView({
  events,
  companyName,
  actionLoadingId,
  statusChangingId,
  onStatusChange,
  onDelete,
}: AgendaListViewProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Nenhum compromisso agendado para este mês.</CardTitle>
          <CardDescription>
            Cadastre o primeiro compromisso de {companyName} neste mês ou
            ajuste os filtros.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Button asChild>
            <Link href={ROUTES.agendaNew}>
              <Plus className="h-4 w-4" />
              Novo compromisso
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const groups = groupAgendaEventsByDate(events);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.date} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <h2 className="shrink-0 text-sm font-semibold tracking-wide text-[var(--brand-navy)]">
              {formatDayHeader(group.date)}
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2.5">
            {group.events.map((event) => (
              <AgendaEventCard
                key={event.id}
                event={event}
                busy={actionLoadingId === event.id}
                statusChanging={statusChangingId === event.id}
                onStatusChange={(nextStatus) =>
                  onStatusChange(event, nextStatus)
                }
                onDelete={() => onDelete(event)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
