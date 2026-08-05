"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { AgendaDayView } from "@/components/agenda/agenda-day-view";
import { AgendaListView } from "@/components/agenda/agenda-list-view";
import { AgendaMonthSelector } from "@/components/agenda/agenda-month-selector";
import { AgendaMonthView } from "@/components/agenda/agenda-month-view";
import { AgendaSummary } from "@/components/agenda/agenda-summary";
import {
  AgendaViewToggle,
  type AgendaViewMode,
} from "@/components/agenda/agenda-view-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { AGENDA_STATUS_OPTIONS, ROUTES } from "@/lib/constants";
import {
  deleteAgendaEvent,
  listAgendaEvents,
  updateAgendaEventStatus,
  type AgendaEventWithRelations,
} from "@/lib/agenda/actions";
import {
  formatAgendaDate,
  formatEventTimeRange,
  getMonthBounds,
  shiftMonth,
  summarizeAgendaEvents,
  todayDateString,
  toDateString,
} from "@/lib/agenda/format";
import { listCustomers } from "@/lib/customers/actions";
import {
  listCompanyMemberOptions,
  type CompanyMemberOption,
} from "@/lib/tasks/actions";
import { useTenant } from "@/providers/tenant-provider";
import type { Customer } from "@/types/database";

function DeleteAgendaDialogContent({
  event,
  deleting,
  onCancel,
  onConfirm,
}: {
  event: AgendaEventWithRelations;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tem certeza de que deseja excluir este compromisso?
      </p>
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <p className="font-medium text-[var(--brand-navy)]">{event.title}</p>
        <p className="mt-0.5 text-muted-foreground">
          {formatAgendaDate(event.start_date)} · {formatEventTimeRange(event)}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={deleting}
          onClick={onCancel}
        >
          Voltar
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={deleting}
          onClick={onConfirm}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Excluir compromisso
        </Button>
      </div>
    </div>
  );
}

export function AgendaList() {
  const { company } = useTenant();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [viewMode, setViewMode] = useState<AgendaViewMode>("list");
  const [events, setEvents] = useState<AgendaEventWithRelations[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [assignedUserId, setAssignedUserId] = useState("all");
  const [relatedCustomerId, setRelatedCustomerId] = useState("all");
  const [members, setMembers] = useState<CompanyMemberOption[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [eventPendingDelete, setEventPendingDelete] =
    useState<AgendaEventWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  const companyId = company?.id;
  const monthBounds = useMemo(
    () => getMonthBounds(year, monthIndex),
    [year, monthIndex]
  );

  useEffect(() => {
    if (!companyId) return;
    const activeCompanyId = companyId;

    let active = true;

    async function loadOptions() {
      const [membersResult, customersResult] = await Promise.all([
        listCompanyMemberOptions(activeCompanyId),
        listCustomers({ companyId: activeCompanyId, status: "active" }),
      ]);

      if (!active) return;

      if (membersResult.data) setMembers(membersResult.data);
      if (customersResult.data) setCustomers(customersResult.data);
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, [companyId]);

  const loadEvents = useCallback(async () => {
    if (!companyId) {
      setEvents([]);
      setLoading(false);
      setError("Selecione uma empresa ativa para gerenciar a agenda.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listAgendaEvents({
      companyId,
      search,
      status,
      periodFrom: monthBounds.periodFrom,
      periodTo: monthBounds.periodTo,
      assignedUserId,
      relatedCustomerId,
    });

    if (result.error) {
      setEvents([]);
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setEvents(result.data);
    setLoading(false);
  }, [
    companyId,
    search,
    status,
    monthBounds.periodFrom,
    monthBounds.periodTo,
    assignedUserId,
    relatedCustomerId,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadEvents();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadEvents]);

  useEffect(() => {
    if (
      selectedDate < monthBounds.periodFrom ||
      selectedDate > monthBounds.periodTo
    ) {
      setSelectedDate(monthBounds.periodFrom);
    }
  }, [monthBounds.periodFrom, monthBounds.periodTo, selectedDate]);

  const summary = useMemo(() => summarizeAgendaEvents(events), [events]);

  function goToToday() {
    const today = new Date();
    setYear(today.getFullYear());
    setMonthIndex(today.getMonth());
    setSelectedDate(todayDateString());
  }

  function goToPreviousMonth() {
    const next = shiftMonth(year, monthIndex, -1);
    setYear(next.year);
    setMonthIndex(next.monthIndex);
  }

  function goToNextMonth() {
    const next = shiftMonth(year, monthIndex, 1);
    setYear(next.year);
    setMonthIndex(next.monthIndex);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    const [y, m] = date.split("-").map(Number);
    if (y && m) {
      setYear(y);
      setMonthIndex(m - 1);
    }
    setViewMode("day");
  }

  async function handleStatusChange(
    event: AgendaEventWithRelations,
    nextStatus: string
  ) {
    if (!companyId || event.status === nextStatus) return;

    const previous = event;
    setStatusChangingId(event.id);
    setError(null);

    setEvents((current) =>
      current.map((item) =>
        item.id === event.id ? { ...item, status: nextStatus } : item
      )
    );

    const result = await updateAgendaEventStatus(
      companyId,
      event.id,
      nextStatus
    );

    if (result.error || !result.data) {
      setEvents((current) =>
        current.map((item) => (item.id === previous.id ? previous : item))
      );
      setError(
        result.error?.message ??
          "Não foi possível atualizar o status do compromisso. Tente novamente."
      );
      setStatusChangingId(null);
      return;
    }

    setEvents((current) => {
      const updated = current.map((item) =>
        item.id === event.id ? result.data! : item
      );

      if (status !== "all" && result.data!.status !== status) {
        return updated.filter((item) => item.id !== event.id);
      }

      return updated;
    });
    setStatusChangingId(null);
  }

  async function handleConfirmDelete() {
    if (!companyId || !eventPendingDelete) return;

    setDeleting(true);
    setActionLoadingId(eventPendingDelete.id);
    setError(null);

    const result = await deleteAgendaEvent(companyId, eventPendingDelete.id);

    if (result.error) {
      setError(result.error.message);
      setDeleting(false);
      setActionLoadingId(null);
      return;
    }

    setEvents((current) =>
      current.filter((item) => item.id !== eventPendingDelete.id)
    );
    setEventPendingDelete(null);
    setDeleting(false);
    setActionLoadingId(null);
  }

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa ativa</CardTitle>
          <CardDescription>
            Selecione ou cadastre uma empresa para gerenciar a agenda.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <AgendaMonthSelector
          year={year}
          monthIndex={monthIndex}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          onToday={goToToday}
        />
        <div className="flex flex-wrap items-center gap-2">
          <AgendaViewToggle value={viewMode} onChange={setViewMode} />
          <Button asChild>
            <Link href={ROUTES.agendaNew}>
              <Plus className="h-4 w-4" />
              Novo compromisso
            </Link>
          </Button>
        </div>
      </div>

      <AgendaSummary
        total={summary.total}
        scheduled={summary.scheduled}
        confirmed={summary.confirmed}
        in_progress={summary.in_progress}
        completed={summary.completed}
        canceled={summary.canceled}
        rescheduled={summary.rescheduled}
      />

      <div className="space-y-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por título, descrição ou local"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos os status</option>
            {AGENDA_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={assignedUserId}
            onChange={(e) => setAssignedUserId(e.target.value)}
          >
            <option value="all">Todos os responsáveis</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.full_name || "Usuário sem nome"}
              </option>
            ))}
          </Select>
          <Select
            value={relatedCustomerId}
            onChange={(e) => setRelatedCustomerId(e.target.value)}
          >
            <option value="all">Todos os clientes</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.trade_name || customer.full_name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando compromissos...
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <AgendaListView
          events={events}
          companyName={company.name}
          actionLoadingId={actionLoadingId}
          statusChangingId={statusChangingId}
          onStatusChange={(event, nextStatus) =>
            void handleStatusChange(event, nextStatus)
          }
          onDelete={setEventPendingDelete}
        />
      ) : viewMode === "month" ? (
        <AgendaMonthView
          year={year}
          monthIndex={monthIndex}
          events={events}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
        />
      ) : (
        <AgendaDayView
          selectedDate={selectedDate}
          events={events}
          actionLoadingId={actionLoadingId}
          statusChangingId={statusChangingId}
          onStatusChange={(event, nextStatus) =>
            void handleStatusChange(event, nextStatus)
          }
          onDelete={setEventPendingDelete}
          onChangeDate={(date) => {
            const [y, m, d] = date.split("-").map(Number);
            if (y && m && d) {
              setYear(y);
              setMonthIndex(m - 1);
              setSelectedDate(toDateString(y, m - 1, d));
            } else {
              setSelectedDate(date);
            }
          }}
        />
      )}

      <Dialog
        open={Boolean(eventPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setEventPendingDelete(null);
        }}
        title="Excluir compromisso"
        description="Esta ação não pode ser desfeita"
        className="max-w-md"
      >
        {eventPendingDelete ? (
          <DeleteAgendaDialogContent
            event={eventPendingDelete}
            deleting={deleting}
            onCancel={() => setEventPendingDelete(null)}
            onConfirm={() => void handleConfirmDelete()}
          />
        ) : null}
      </Dialog>
    </div>
  );
}
