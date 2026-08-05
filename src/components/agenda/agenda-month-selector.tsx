"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonthLabel } from "@/lib/agenda/format";

type AgendaMonthSelectorProps = {
  year: number;
  monthIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function AgendaMonthSelector({
  year,
  monthIndex,
  onPrevious,
  onNext,
  onToday,
}: AgendaMonthSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={onPrevious}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-[10.5rem] px-2 text-center text-sm font-semibold text-[var(--brand-navy)] sm:min-w-[12rem] sm:text-base">
          {formatMonthLabel(year, monthIndex)}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={onNext}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-11 rounded-xl"
        onClick={onToday}
      >
        Hoje
      </Button>
    </div>
  );
}
