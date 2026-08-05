"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Plus, User } from "lucide-react";
import { AgendaStatusBadge } from "@/components/agenda/agenda-status-badge";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { DashboardSectionLink } from "@/components/dashboard/dashboard-section-link";
import { ROUTES, agendaDetailPath } from "@/lib/constants";
import {
  listUpcomingAgendaEvents,
  type AgendaEventWithRelations,
} from "@/lib/agenda/actions";
import {
  formatAgendaDate,
  formatEventTimeRange,
  formatWeekdayLong,
  todayDateString,
} from "@/lib/agenda/format";
import { cn } from "@/lib/utils";

type ExecutiveUpcomingAgendaProps = {
  companyId: string;
};

function customerLabel(event: AgendaEventWithRelations) {
  return (
    event.related_customer?.trade_name ||
    event.related_customer?.full_name ||
    "Sem cliente"
  );
}

const eventCardClass = cn(
  "min-w-0 rounded-2xl border border-[var(--brand-navy)]/[0.08] bg-white/95 px-3 py-2.5 sm:px-3.5 sm:py-3",
  "shadow-[0_3px_12px_rgb(17_32_59/0.05)]",
  "transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out",
  "hover:-translate-y-0.5 hover:scale-[1.015] hover:border-[var(--brand-gold)]/50",
  "hover:shadow-[0_10px_24px_rgb(17_32_59/0.1)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/45",
  "motion-reduce:hover:scale-100"
);

export function ExecutiveUpcomingAgenda({
  companyId,
}: ExecutiveUpcomingAgendaProps) {
  const [events, setEvents] = useState<AgendaEventWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadEvents = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const result = await listUpcomingAgendaEvents(companyId, 5);

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (result.error || !result.data) {
      setEvents([]);
      setError(result.error?.message ?? "Erro ao carregar compromissos.");
      setLoading(false);
      return;
    }

    setEvents(result.data);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const today = todayDateString();

  return (
    <DashboardSectionCard
      title="Próximos compromissos"
      accent="blue"
      titleIcon={
        <CalendarDays className="h-4 w-4 text-[#1e4a7a]" aria-hidden />
      }
      elevation="secondary"
      className={cn(
        "relative w-full min-w-0 overflow-hidden",
        "border border-[var(--brand-gold)]/55",
        "bg-[linear-gradient(135deg,#ffffff_0%,#f4f7fb_48%,#fff9f4_100%)]",
        "shadow-[0_6px_20px_rgb(17_32_59/0.08),0_16px_36px_rgb(200_155_60/0.12)]",
        "hover:border-[var(--brand-gold)]/70",
        "hover:shadow-[0_10px_28px_rgb(17_32_59/0.1),0_20px_40px_rgb(200_155_60/0.16)]"
      )}
      headerClassName="items-start gap-2 px-3.5 pb-2 pt-3 sm:items-center sm:gap-3 sm:px-5 sm:pb-2.5 sm:pt-3.5"
      titleClassName="text-[15px] font-bold tracking-[-0.02em] text-[#0f1b33] sm:text-[16.5px]"
      contentClassName="flex-none px-3.5 pb-3 pt-0.5 sm:px-5 sm:pb-3.5"
      action={
        <div className="flex max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
          <DashboardSectionLink
            href={ROUTES.agendaNew}
            className="rounded-full bg-[var(--brand-coral)] px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_2px_8px_rgb(196_147_159/0.35)] transition-all duration-200 hover:bg-[var(--brand-coral)]/90 hover:text-white hover:shadow-[0_4px_12px_rgb(196_147_159/0.4)] sm:px-3.5 sm:text-[12.5px]"
          >
            Novo compromisso
          </DashboardSectionLink>
          <DashboardSectionLink
            href={ROUTES.agenda}
            className="rounded-full border border-[var(--brand-gold)]/55 bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--brand-navy)]/80 shadow-[0_1px_3px_rgb(11_31_58/0.04)] transition-all duration-200 hover:border-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/[0.06] hover:text-[var(--brand-navy)] sm:px-3.5 sm:text-[12.5px]"
          >
            Ver agenda completa
          </DashboardSectionLink>
        </div>
      }
    >
      {error ? (
        <div className="mb-2.5 rounded-xl border border-[var(--brand-coral)]/25 bg-[var(--brand-coral)]/[0.08] px-3 py-2 text-[13px] text-[var(--brand-navy)]/80">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-w-0 flex-col gap-2.5 md:flex-row md:overflow-x-auto md:pb-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                eventCardClass,
                "pointer-events-none min-h-[128px] w-full md:w-[240px] md:shrink-0"
              )}
            >
              <div className="h-3.5 w-24 animate-pulse rounded bg-[var(--brand-navy)]/[0.07]" />
              <div className="mt-2 h-4 w-3/5 animate-pulse rounded bg-[var(--brand-navy)]/[0.08]" />
              <div className="mt-3 h-2.5 w-2/5 animate-pulse rounded bg-[var(--brand-navy)]/[0.05]" />
              <div className="mt-3 h-5 w-16 animate-pulse rounded-md bg-[var(--brand-gold)]/15" />
            </div>
          ))}
        </div>
      ) : !events.length ? (
        <div
          className={cn(
            eventCardClass,
            "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 hover:translate-y-0 hover:scale-100"
          )}
        >
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#0f1b33]">
              Nenhum compromisso próximo.
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--brand-navy)]/65">
              Organize a agenda da empresa criando um novo compromisso.
            </p>
          </div>
          <DashboardSectionLink
            href={ROUTES.agendaNew}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-coral)] px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors duration-200 hover:bg-[var(--brand-coral)]/90 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar compromisso
          </DashboardSectionLink>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-2.5 md:flex-row md:overflow-x-auto md:pb-1">
          {events.map((event) => {
            const isToday = event.start_date === today;
            const detailHref = agendaDetailPath(event.id);
            const timeRange = formatEventTimeRange(event);
            const responsible =
              event.assigned_user?.full_name?.trim() || "Sem responsável";
            const location = event.location?.trim() || "Sem local";

            return (
              <Link
                key={event.id}
                href={detailHref}
                className={cn(
                  eventCardClass,
                  "block w-full md:w-[248px] md:shrink-0 xl:w-[260px]",
                  isToday &&
                    "border-[var(--brand-gold)]/70 bg-[linear-gradient(160deg,#fff8eb_0%,#ffffff_50%,#f7eef1_100%)] shadow-[0_8px_22px_rgb(200_155_60/0.2)] ring-1 ring-[var(--brand-gold)]/40"
                )}
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-[var(--brand-navy)]/70">
                      {formatAgendaDate(event.start_date)}
                      <span className="mx-1 text-[var(--brand-navy)]/30">
                        ·
                      </span>
                      {formatWeekdayLong(event.start_date)}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[13px] font-bold tabular-nums tracking-tight",
                        isToday
                          ? "text-[var(--brand-gold)]"
                          : "text-[#1e4a7a]"
                      )}
                    >
                      {timeRange}
                    </p>
                  </div>
                  {isToday ? (
                    <span className="shrink-0 rounded-full border border-[var(--brand-gold)]/70 bg-[var(--brand-gold)] px-2.5 py-0.5 text-[10.5px] font-bold tracking-[0.04em] text-white shadow-[0_2px_10px_rgb(200_155_60/0.4)]">
                      Hoje
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 line-clamp-2 text-[14px] font-bold leading-snug tracking-[-0.015em] text-[#0f1b33]">
                  {event.title}
                </p>

                <div className="mt-2 space-y-1 text-[11.5px] font-medium text-[var(--brand-navy)]/70">
                  <p className="truncate">{customerLabel(event)}</p>
                  <p className="flex min-w-0 items-center gap-1 truncate">
                    <User className="h-3 w-3 shrink-0 text-[var(--brand-gold)]" />
                    <span className="truncate">{responsible}</span>
                  </p>
                  <p className="flex min-w-0 items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0 text-[var(--brand-coral)]" />
                    <span className="truncate">{location}</span>
                  </p>
                </div>

                <div className="mt-2">
                  <AgendaStatusBadge status={event.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardSectionCard>
  );
}
