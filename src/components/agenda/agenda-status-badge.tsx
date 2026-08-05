import { cn } from "@/lib/utils";
import {
  agendaVisualStatusLabel,
  getAgendaStatusVisual,
} from "@/lib/agenda/visual";

type AgendaStatusBadgeProps = {
  status: string;
  className?: string;
};

export function AgendaStatusBadge({
  status,
  className,
}: AgendaStatusBadgeProps) {
  const visual = getAgendaStatusVisual(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        visual.badge,
        className
      )}
    >
      {agendaVisualStatusLabel(status)}
    </span>
  );
}
