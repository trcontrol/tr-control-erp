"use client";

import { AgendaStatusBadge } from "@/components/agenda/agenda-status-badge";
import type { AgendaEventWithRelations } from "@/lib/agenda/actions";
import {
  WEEKDAY_SHORT_LABELS,
  formatAgendaTime,
  getMonthGridDays,
  isAgendaAllDay,
  todayDateString,
} from "@/lib/agenda/format";
import { getAgendaStatusVisual } from "@/lib/agenda/visual";
import { cn } from "@/lib/utils";

type AgendaMonthViewProps = {
  year: number;
  monthIndex: number;
  events: AgendaEventWithRelations[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

export function AgendaMonthView({
  year,
  monthIndex,
  events,
  selectedDate,
  onSelectDate,
}: AgendaMonthViewProps) {
  const today = todayDateString();
  const cells = getMonthGridDays(year, monthIndex);
  const byDate = new Map<string, AgendaEventWithRelations[]>();

  for (const event of events) {
    const list = byDate.get(event.start_date) ?? [];
    list.push(event);
    byDate.set(event.start_date, list);
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_4px_16px_rgba(11,31,58,0.06)]">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {WEEKDAY_SHORT_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, index) => {
          if (!cell.date || cell.day === null) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[88px] border-b border-r bg-muted/20 last:border-r-0 sm:min-h-[112px]"
              />
            );
          }

          const dayEvents = byDate.get(cell.date) ?? [];
          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const preview = dayEvents.slice(0, 3);
          const remaining = dayEvents.length - preview.length;

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDate(cell.date!)}
              className={cn(
                "flex min-h-[88px] flex-col gap-1 border-b border-r p-1.5 text-left transition-colors last:border-r-0 sm:min-h-[112px] sm:p-2",
                "hover:bg-[var(--brand-navy)]/[0.03]",
                isSelected && "bg-[var(--brand-coral)]/10",
                isToday && !isSelected && "bg-sky-50/70"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  isToday
                    ? "bg-[var(--brand-navy)] text-white"
                    : "text-[var(--brand-navy)]"
                )}
              >
                {cell.day}
              </span>

              <div className="hidden min-h-0 flex-1 space-y-1 overflow-hidden sm:block">
                {preview.map((event) => {
                  const visual = getAgendaStatusVisual(event.status);
                  const customer =
                    event.related_customer?.trade_name ||
                    event.related_customer?.full_name ||
                    event.title;
                  const time = isAgendaAllDay(event)
                    ? "Dia"
                    : (formatAgendaTime(event.start_time) ?? "—");

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium shadow-sm",
                        visual.monthChip
                      )}
                      title={`${time} · ${customer} · ${event.title}`}
                    >
                      <span className="font-bold">{time}</span> {customer}
                    </div>
                  );
                })}
                {remaining > 0 ? (
                  <p className="px-1 text-[11px] text-muted-foreground">
                    +{remaining} mais
                  </p>
                ) : null}
              </div>

              <div className="mt-auto flex items-center gap-1 sm:hidden">
                {dayEvents.slice(0, 4).map((event) => (
                  <span
                    key={event.id}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      getAgendaStatusVisual(event.status).monthDot
                    )}
                  />
                ))}
                {dayEvents.length > 4 ? (
                  <span className="text-[11px] text-muted-foreground">
                    +{dayEvents.length - 4}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDate ? (
        <div className="border-t px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-[var(--brand-navy)]">
              Compromissos do dia selecionado
            </p>
            <span className="text-xs text-muted-foreground">
              {(byDate.get(selectedDate) ?? []).length} no dia
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(byDate.get(selectedDate) ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum compromisso neste dia.
              </p>
            ) : (
              (byDate.get(selectedDate) ?? []).map((event) => {
                const visual = getAgendaStatusVisual(event.status);
                const customer =
                  event.related_customer?.trade_name ||
                  event.related_customer?.full_name ||
                  "Sem cliente";

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "inline-flex max-w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs shadow-sm",
                      visual.surface,
                      visual.border
                    )}
                  >
                    <span className={cn("font-bold", visual.time)}>
                      {isAgendaAllDay(event)
                        ? "Dia inteiro"
                        : formatAgendaTime(event.start_time) || "—"}
                    </span>
                    <span className={cn("truncate font-medium", visual.text)}>
                      {customer}
                    </span>
                    <span className={cn("truncate", visual.muted)}>
                      {event.title}
                    </span>
                    <AgendaStatusBadge status={event.status} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
