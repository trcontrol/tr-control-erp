"use client";

import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarX2,
  ListChecks,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AgendaSummaryProps = {
  total: number;
  scheduled: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  canceled: number;
  rescheduled: number;
};

const ITEMS = [
  {
    key: "total",
    label: "Total",
    icon: ListChecks,
    accent: "text-[var(--brand-navy)] bg-[var(--brand-navy)]/8",
  },
  {
    key: "scheduled",
    label: "Agendados",
    icon: CalendarClock,
    accent: "text-sky-700 bg-sky-50",
  },
  {
    key: "confirmed",
    label: "Confirmados",
    icon: CalendarCheck2,
    accent: "text-emerald-700 bg-emerald-50",
  },
  {
    key: "in_progress",
    label: "Em andamento",
    icon: CalendarRange,
    accent: "text-amber-700 bg-amber-50",
  },
  {
    key: "completed",
    label: "Concluídos",
    icon: CalendarDays,
    accent: "text-slate-600 bg-slate-100",
  },
  {
    key: "canceled",
    label: "Cancelados",
    icon: CalendarX2,
    accent: "text-red-600 bg-red-50",
  },
  {
    key: "rescheduled",
    label: "Reagendados",
    icon: RefreshCw,
    accent: "text-violet-700 bg-violet-50",
  },
] as const;

export function AgendaSummary(props: AgendaSummaryProps) {
  const values = props;

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-2xl border bg-card px-3.5 py-3 shadow-sm transition-shadow duration-300"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                item.accent
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">
                {item.label}
              </p>
              <p className="text-lg font-semibold tracking-tight text-[var(--brand-navy)]">
                {values[item.key]}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
