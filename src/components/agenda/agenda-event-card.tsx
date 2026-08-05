"use client";

import Link from "next/link";
import {
  CalendarClock,
  Eye,
  Loader2,
  MapPin,
  Pencil,
  Stethoscope,
  Trash2,
  UserRound,
} from "lucide-react";
import { AgendaStatusSelect } from "@/components/agenda/agenda-status-select";
import { Button } from "@/components/ui/button";
import {
  agendaDetailPath,
  agendaEditPath,
} from "@/lib/constants";
import type { AgendaEventWithRelations } from "@/lib/agenda/actions";
import {
  formatEventTimeRange,
  isAgendaAllDay,
} from "@/lib/agenda/format";
import { getAgendaStatusVisual } from "@/lib/agenda/visual";
import { cn } from "@/lib/utils";

type AgendaEventCardProps = {
  event: AgendaEventWithRelations;
  busy?: boolean;
  statusChanging?: boolean;
  onStatusChange?: (status: string) => void;
  onDelete?: () => void;
};

export function AgendaEventCard({
  event,
  busy = false,
  statusChanging = false,
  onStatusChange,
  onDelete,
}: AgendaEventCardProps) {
  const timeRange = formatEventTimeRange(event);
  const allDay = isAgendaAllDay(event);
  const customer =
    event.related_customer?.trade_name ||
    event.related_customer?.full_name ||
    "Sem cliente";
  const responsible = event.assigned_user?.full_name || "Sem responsável";
  const visual = getAgendaStatusVisual(event.status);
  const startLabel = allDay ? "Dia inteiro" : timeRange.split(" – ")[0];
  const endLabel =
    !allDay && timeRange.includes(" – ")
      ? `até ${timeRange.split(" – ")[1]}`
      : null;

  return (
    <article
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border p-4 shadow-[0_4px_16px_rgba(11,31,58,0.06)] sm:flex-row sm:items-stretch sm:gap-4 sm:px-5 sm:py-4",
        "transition-[background-color,border-color,box-shadow,transform,opacity] duration-300 ease-out",
        "hover:shadow-[0_8px_22px_rgba(11,31,58,0.10)]",
        statusChanging && "scale-[0.995] opacity-90 ring-2 ring-[var(--brand-gold)]/35",
        visual.surface,
        visual.border
      )}
    >
      <div className="flex shrink-0 items-start gap-3 sm:w-[7.25rem] sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:border-r sm:border-black/5 sm:pr-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300",
            visual.iconWrap
          )}
        >
          <CalendarClock
            className={cn("h-5 w-5 transition-colors duration-300", visual.icon)}
            strokeWidth={1.75}
          />
        </div>
        <div className="min-w-0 sm:text-center">
          <p
            className={cn(
              "text-xl font-bold tracking-tight transition-colors duration-300 sm:text-2xl",
              visual.time
            )}
          >
            {startLabel}
          </p>
          {endLabel ? (
            <p
              className={cn(
                "text-xs font-medium transition-colors duration-300",
                visual.muted
              )}
            >
              {endLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p
            className={cn(
              "truncate text-base font-semibold transition-colors duration-300",
              visual.text
            )}
          >
            {customer}
          </p>
          {onStatusChange ? (
            <AgendaStatusSelect
              value={event.status}
              busy={statusChanging || busy}
              onChange={onStatusChange}
            />
          ) : null}
        </div>

        <p
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-sm font-medium transition-colors duration-300",
            visual.muted
          )}
        >
          <UserRound
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-colors duration-300",
              visual.icon
            )}
          />
          <span className="truncate">{responsible}</span>
        </p>

        <p
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-sm font-semibold transition-colors duration-300",
            visual.text
          )}
        >
          <Stethoscope
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-colors duration-300",
              visual.icon
            )}
          />
          <span className="truncate">{event.title}</span>
        </p>

        {event.location ? (
          <p
            className={cn(
              "flex min-w-0 items-center gap-1.5 text-sm transition-colors duration-300",
              visual.muted
            )}
          >
            <MapPin
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-colors duration-300",
                visual.icon
              )}
            />
            <span className="truncate">{event.location}</span>
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1 border-t border-black/5 pt-3 sm:border-t-0 sm:border-l sm:pl-3 sm:pt-0">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={cn("shrink-0 hover:bg-white/70", visual.icon)}
        >
          <Link href={agendaDetailPath(event.id)} title="Visualizar">
            <Eye className="h-4 w-4" />
            <span className="sr-only">Visualizar</span>
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={cn("shrink-0 hover:bg-white/70", visual.icon)}
        >
          <Link href={agendaEditPath(event.id)} title="Editar">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Editar</span>
          </Link>
        </Button>
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-red-600 hover:bg-red-100/80 hover:text-red-700"
            disabled={busy || statusChanging}
            onClick={onDelete}
            title="Excluir"
            aria-label="Excluir"
          >
            {busy && !statusChanging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
