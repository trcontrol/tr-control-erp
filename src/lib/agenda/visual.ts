/**
 * Aparência visual dos compromissos por status.
 */

export type AgendaVisualTone = {
  key:
    | "scheduled"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "canceled"
    | "rescheduled";
  label: string;
  surface: string;
  border: string;
  iconWrap: string;
  icon: string;
  time: string;
  text: string;
  muted: string;
  badge: string;
  monthChip: string;
  monthDot: string;
  select: string;
};

const VISUAL_BY_STATUS: Record<string, AgendaVisualTone> = {
  scheduled: {
    key: "scheduled",
    label: "Agendado",
    surface: "bg-sky-50",
    border: "border-sky-300",
    iconWrap: "bg-sky-100",
    icon: "text-sky-600",
    time: "text-sky-800",
    text: "text-sky-950",
    muted: "text-sky-800/75",
    badge: "bg-sky-100 text-sky-800",
    monthChip: "bg-sky-100 text-sky-800 border-sky-300",
    monthDot: "bg-sky-500",
    select:
      "border-sky-300 bg-sky-100 text-sky-800 focus-visible:ring-sky-300",
  },
  confirmed: {
    key: "confirmed",
    label: "Confirmado",
    surface: "bg-emerald-50",
    border: "border-emerald-300",
    iconWrap: "bg-emerald-100",
    icon: "text-emerald-600",
    time: "text-emerald-800",
    text: "text-emerald-950",
    muted: "text-emerald-800/75",
    badge: "bg-emerald-100 text-emerald-800",
    monthChip: "bg-emerald-100 text-emerald-800 border-emerald-300",
    monthDot: "bg-emerald-500",
    select:
      "border-emerald-300 bg-emerald-100 text-emerald-800 focus-visible:ring-emerald-300",
  },
  in_progress: {
    key: "in_progress",
    label: "Em andamento",
    surface: "bg-amber-50",
    border: "border-amber-300",
    iconWrap: "bg-amber-100",
    icon: "text-amber-600",
    time: "text-amber-900",
    text: "text-amber-950",
    muted: "text-amber-900/75",
    badge: "bg-amber-100 text-amber-900",
    monthChip: "bg-amber-100 text-amber-900 border-amber-300",
    monthDot: "bg-amber-500",
    select:
      "border-amber-300 bg-amber-100 text-amber-900 focus-visible:ring-amber-300",
  },
  completed: {
    key: "completed",
    label: "Concluído",
    surface: "bg-slate-100",
    border: "border-slate-300",
    iconWrap: "bg-slate-200",
    icon: "text-slate-500",
    time: "text-slate-700",
    text: "text-slate-800",
    muted: "text-slate-600",
    badge: "bg-slate-200 text-slate-700",
    monthChip: "bg-slate-200 text-slate-700 border-slate-300",
    monthDot: "bg-slate-500",
    select:
      "border-slate-300 bg-slate-200 text-slate-700 focus-visible:ring-slate-300",
  },
  canceled: {
    key: "canceled",
    label: "Cancelado",
    surface: "bg-red-50",
    border: "border-red-300",
    iconWrap: "bg-red-100",
    icon: "text-red-500",
    time: "text-red-800",
    text: "text-red-950",
    muted: "text-red-800/75",
    badge: "bg-red-100 text-red-800",
    monthChip: "bg-red-100 text-red-800 border-red-300",
    monthDot: "bg-red-500",
    select:
      "border-red-300 bg-red-100 text-red-800 focus-visible:ring-red-300",
  },
  rescheduled: {
    key: "rescheduled",
    label: "Reagendado",
    surface: "bg-violet-50",
    border: "border-violet-300",
    iconWrap: "bg-violet-100",
    icon: "text-violet-600",
    time: "text-violet-800",
    text: "text-violet-950",
    muted: "text-violet-800/75",
    badge: "bg-violet-100 text-violet-800",
    monthChip: "bg-violet-100 text-violet-800 border-violet-300",
    monthDot: "bg-violet-500",
    select:
      "border-violet-300 bg-violet-100 text-violet-800 focus-visible:ring-violet-300",
  },
};

/** Aceita grafia legada "cancelled" sem alterar a UI. */
export function normalizeAgendaStatusKey(status: string) {
  if (status === "cancelled") return "canceled";
  return status;
}

export function getAgendaStatusVisual(status: string): AgendaVisualTone {
  const key = normalizeAgendaStatusKey(status);
  return VISUAL_BY_STATUS[key] ?? VISUAL_BY_STATUS.scheduled;
}

export function agendaVisualStatusLabel(status: string) {
  return getAgendaStatusVisual(status).label;
}
