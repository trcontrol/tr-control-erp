"use client";

import { Calendar, CalendarDays, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgendaViewMode = "list" | "month" | "day";

const VIEWS: Array<{
  value: AgendaViewMode;
  label: string;
  icon: typeof List;
}> = [
  { value: "list", label: "Lista", icon: List },
  { value: "month", label: "Mês", icon: Calendar },
  { value: "day", label: "Dia", icon: CalendarDays },
];

type AgendaViewToggleProps = {
  value: AgendaViewMode;
  onChange: (value: AgendaViewMode) => void;
};

export function AgendaViewToggle({ value, onChange }: AgendaViewToggleProps) {
  return (
    <div
      className="inline-flex rounded-xl border bg-card p-1 shadow-sm"
      role="tablist"
      aria-label="Modo de visualização"
    >
      {VIEWS.map((view) => {
        const Icon = view.icon;
        const active = value === view.value;

        return (
          <button
            key={view.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(view.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--brand-navy)] text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
