import { AGENDA_STATUS, AGENDA_STATUS_OPTIONS } from "@/lib/constants";

export function agendaStatusLabel(status: string) {
  return (
    AGENDA_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

export function formatAgendaDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

export function formatAgendaTime(value?: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return value;
  return `${match[1]}:${match[2]}`;
}

export function normalizeAgendaTime(value?: string | null) {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}:00`;
}

export function agendaStatusTone(status: string) {
  if (status === AGENDA_STATUS.confirmed) {
    return "text-emerald-700";
  }
  if (status === AGENDA_STATUS.in_progress) {
    return "text-amber-700";
  }
  if (status === AGENDA_STATUS.completed) {
    return "text-slate-600";
  }
  if (status === AGENDA_STATUS.canceled || status === "cancelled") {
    return "text-red-600";
  }
  if (status === AGENDA_STATUS.rescheduled) {
    return "text-violet-700";
  }
  return "text-sky-700";
}

export type AgendaStatusBadgeTone =
  | "neutral"
  | "positive"
  | "negative"
  | "info"
  | "warning";

export function agendaStatusBadgeTone(status: string): AgendaStatusBadgeTone {
  if (status === AGENDA_STATUS.confirmed) return "positive";
  if (status === AGENDA_STATUS.in_progress) return "warning";
  if (status === AGENDA_STATUS.completed) return "neutral";
  if (status === AGENDA_STATUS.canceled || status === "cancelled") {
    return "negative";
  }
  if (status === AGENDA_STATUS.rescheduled) return "info";
  return "info";
}

export function isAgendaAllDay(event: {
  all_day?: boolean;
  start_time?: string | null;
}) {
  return Boolean(event.all_day) || !event.start_time;
}

/** All-day / no-time first, then by start time ascending within the same day. */
export function compareAgendaEventsByStart(
  a: {
    start_date: string;
    start_time: string | null;
    all_day?: boolean;
  },
  b: {
    start_date: string;
    start_time: string | null;
    all_day?: boolean;
  }
) {
  if (a.start_date !== b.start_date) {
    return a.start_date.localeCompare(b.start_date);
  }

  const aAllDay = isAgendaAllDay(a);
  const bAllDay = isAgendaAllDay(b);
  if (aAllDay !== bAllDay) {
    return aAllDay ? -1 : 1;
  }

  const timeA = a.start_time ?? "00:00:00";
  const timeB = b.start_time ?? "00:00:00";
  return timeA.localeCompare(timeB);
}

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateString(year: number, monthIndex: number, day: number) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function parseDateString(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, monthIndex: (month ?? 1) - 1, day: day ?? 1 };
}

export function todayDateString() {
  const now = new Date();
  return toDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getMonthBounds(year: number, monthIndex: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    periodFrom: toDateString(year, monthIndex, 1),
    periodTo: toDateString(year, monthIndex, lastDay),
  };
}

export function formatMonthLabel(year: number, monthIndex: number) {
  const label = new Date(year, monthIndex, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekdayLong(dateString: string) {
  const { year, monthIndex, day } = parseDateString(dateString);
  const label = new Date(year, monthIndex, day).toLocaleDateString("pt-BR", {
    weekday: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDayHeader(dateString: string) {
  const { year, monthIndex, day } = parseDateString(dateString);
  const date = new Date(year, monthIndex, day);
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  const formatted = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });
  const weekdayLabel = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${formatted} · ${weekdayLabel}`;
}

export function formatEventTimeRange(event: {
  all_day?: boolean;
  start_time: string | null;
  end_time: string | null;
}) {
  if (isAgendaAllDay(event)) {
    return "Dia inteiro";
  }

  const start = formatAgendaTime(event.start_time);
  const end = formatAgendaTime(event.end_time);

  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return "—";
}

export type AgendaDayGroup<T> = {
  date: string;
  events: T[];
};

export function groupAgendaEventsByDate<
  T extends {
    start_date: string;
    start_time: string | null;
    all_day?: boolean;
  },
>(events: T[]): AgendaDayGroup<T>[] {
  const sorted = [...events].sort(compareAgendaEventsByStart);
  const map = new Map<string, T[]>();

  for (const event of sorted) {
    const current = map.get(event.start_date) ?? [];
    current.push(event);
    map.set(event.start_date, current);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayEvents]) => ({ date, events: dayEvents }));
}

export function summarizeAgendaEvents(events: Array<{ status: string }>) {
  const counts = {
    scheduled: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    canceled: 0,
    rescheduled: 0,
  };

  for (const event of events) {
    const status =
      event.status === "cancelled" ? AGENDA_STATUS.canceled : event.status;

    if (status === AGENDA_STATUS.scheduled) counts.scheduled += 1;
    else if (status === AGENDA_STATUS.confirmed) counts.confirmed += 1;
    else if (status === AGENDA_STATUS.in_progress) counts.in_progress += 1;
    else if (status === AGENDA_STATUS.completed) counts.completed += 1;
    else if (status === AGENDA_STATUS.canceled) counts.canceled += 1;
    else if (status === AGENDA_STATUS.rescheduled) counts.rescheduled += 1;
    else counts.scheduled += 1;
  }

  return {
    total: events.length,
    ...counts,
  };
}

export function shiftMonth(year: number, monthIndex: number, delta: number) {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function getMonthGridDays(year: number, monthIndex: number) {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = firstWeekday === 0 ? 6 : firstWeekday - 1; // Monday-first
  const cells: Array<{ date: string | null; day: number | null }> = [];

  for (let i = 0; i < leading; i += 1) {
    cells.push({ date: null, day: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: toDateString(year, monthIndex, day), day });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null });
  }

  return cells;
}

export const WEEKDAY_SHORT_LABELS = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
] as const;
