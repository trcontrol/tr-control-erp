"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
  compareAgendaEventsByStart,
  formatDayHeader,
  parseDateString,
  toDateString,
} from "@/lib/agenda/format";

type AgendaDayViewProps = {
  selectedDate: string;
  events: AgendaEventWithRelations[];
  actionLoadingId: string | null;
  statusChangingId: string | null;
  onStatusChange: (event: AgendaEventWithRelations, status: string) => void;
  onDelete: (event: AgendaEventWithRelations) => void;
  onChangeDate: (date: string) => void;
};

function shiftDay(dateString: string, delta: number) {
  const { year, monthIndex, day } = parseDateString(dateString);
  const next = new Date(year, monthIndex, day + delta);
  return toDateString(next.getFullYear(), next.getMonth(), next.getDate());
}

export function AgendaDayView({
  selectedDate,
  events,
  actionLoadingId,
  statusChangingId,
  onStatusChange,
  onDelete,
  onChangeDate,
}: AgendaDayViewProps) {
  const dayEvents = events
    .filter((event) => event.start_date === selectedDate)
    .sort(compareAgendaEventsByStart);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => onChangeDate(shiftDay(selectedDate, -1))}
            aria-label="Dia anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[12rem] px-2 text-center sm:min-w-[16rem]">
            <p className="text-sm font-semibold text-[var(--brand-navy)]">
              {formatDayHeader(selectedDate)}
            </p>
            <p className="text-xs text-muted-foreground">
              {dayEvents.length}{" "}
              {dayEvents.length === 1 ? "compromisso" : "compromissos"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => onChangeDate(shiftDay(selectedDate, 1))}
            aria-label="Próximo dia"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.agendaNew}>
            <Plus className="h-4 w-4" />
            Novo compromisso
          </Link>
        </Button>
      </div>

      {dayEvents.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-base">
              Nenhum compromisso neste dia.
            </CardTitle>
            <CardDescription>
              Selecione outro dia ou cadastre um novo compromisso.
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
      ) : (
        <div className="space-y-2.5">
          {dayEvents.map((event) => (
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
      )}
    </div>
  );
}
