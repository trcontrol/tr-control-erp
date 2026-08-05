"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { AGENDA_STATUS_OPTIONS } from "@/lib/constants";
import { getAgendaStatusVisual } from "@/lib/agenda/visual";
import { cn } from "@/lib/utils";

type AgendaStatusSelectProps = {
  value: string;
  disabled?: boolean;
  busy?: boolean;
  onChange: (status: string) => void;
  className?: string;
};

export function AgendaStatusSelect({
  value,
  disabled = false,
  busy = false,
  onChange,
  className,
}: AgendaStatusSelectProps) {
  const visual = getAgendaStatusVisual(value);
  const normalized =
    value === "cancelled" ? "canceled" : value;

  return (
    <div className={cn("relative inline-flex min-w-[9.5rem]", className)}>
      <select
        value={normalized}
        disabled={disabled || busy}
        aria-label="Alterar status do compromisso"
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "h-8 w-full appearance-none rounded-lg border py-1 pl-2.5 pr-8 text-xs font-semibold shadow-sm transition-all duration-300 ease-out",
          "focus-visible:outline-none focus-visible:ring-2",
          "disabled:cursor-not-allowed disabled:opacity-70",
          visual.select
        )}
      >
        {/* value = chave interna (scheduled…); label = texto PT-BR na UI */}
        {AGENDA_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        {busy ? (
          <Loader2 className={cn("h-3.5 w-3.5 animate-spin", visual.icon)} />
        ) : (
          <ChevronDown className={cn("h-3.5 w-3.5", visual.icon)} />
        )}
      </span>
    </div>
  );
}
