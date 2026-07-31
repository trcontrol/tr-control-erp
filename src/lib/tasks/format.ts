import {
  TASK_PRIORITY,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS,
  TASK_STATUS_OPTIONS,
} from "@/lib/constants";

export function taskStatusLabel(status: string) {
  return (
    TASK_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
  );
}

export function taskPriorityLabel(priority: string) {
  return (
    TASK_PRIORITY_OPTIONS.find((item) => item.value === priority)?.label ??
    priority
  );
}

export function formatTaskDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

export function formatTaskTime(value?: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return value;
  return `${match[1]}:${match[2]}`;
}

export function normalizeTaskTime(value?: string | null) {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}:00`;
}

export function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTaskOverdue(params: {
  dueDate: string;
  status: string;
  today?: string;
}) {
  const today = params.today ?? todayDateString();
  if (
    params.status === TASK_STATUS.completed ||
    params.status === TASK_STATUS.cancelled
  ) {
    return false;
  }
  return params.dueDate < today;
}

export function taskPriorityTone(priority: string) {
  if (priority === TASK_PRIORITY.urgent) {
    return "text-red-600";
  }
  if (priority === TASK_PRIORITY.high) {
    return "text-[var(--brand-coral)]";
  }
  if (priority === TASK_PRIORITY.low) {
    return "text-muted-foreground";
  }
  return "text-[var(--brand-navy)]";
}

export function taskStatusTone(status: string) {
  if (status === TASK_STATUS.completed) {
    return "text-emerald-700";
  }
  if (status === TASK_STATUS.cancelled) {
    return "text-muted-foreground";
  }
  if (status === TASK_STATUS.in_progress) {
    return "text-[var(--brand-coral)]";
  }
  return "text-[var(--brand-navy)]";
}

export function compareTasksByDueDateTime(
  a: { due_date: string; due_time: string | null },
  b: { due_date: string; due_time: string | null }
) {
  if (a.due_date !== b.due_date) {
    return a.due_date.localeCompare(b.due_date);
  }
  const timeA = a.due_time ?? "99:99:99";
  const timeB = b.due_time ?? "99:99:99";
  return timeA.localeCompare(timeB);
}
