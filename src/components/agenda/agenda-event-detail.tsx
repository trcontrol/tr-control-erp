"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AGENDA_STATUS,
  ROUTES,
  agendaEditPath,
} from "@/lib/constants";
import {
  cancelAgendaEvent,
  completeAgendaEvent,
  deleteAgendaEvent,
  reopenAgendaEvent,
  type AgendaEventWithRelations,
} from "@/lib/agenda/actions";
import {
  agendaStatusLabel,
  agendaStatusTone,
  formatAgendaDate,
  formatAgendaTime,
} from "@/lib/agenda/format";
import { cn } from "@/lib/utils";

type AgendaEventDetailProps = {
  event: AgendaEventWithRelations;
  companyId: string;
};

function InfoItem({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-medium break-words", className)}>
        {value || "—"}
      </p>
    </div>
  );
}

export function AgendaEventDetail({
  event,
  companyId,
}: AgendaEventDetailProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(event);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTime = current.all_day
    ? "Dia inteiro"
    : formatAgendaTime(current.start_time);
  const endTime = current.all_day
    ? "Dia inteiro"
    : formatAgendaTime(current.end_time);

  async function runStatusAction(action: "complete" | "reopen" | "cancel") {
    setLoading(true);
    setError(null);

    const result =
      action === "complete"
        ? await completeAgendaEvent(companyId, current.id)
        : action === "reopen"
          ? await reopenAgendaEvent(companyId, current.id)
          : await cancelAgendaEvent(companyId, current.id);

    if (result.error || !result.data) {
      setError(
        result.error?.message ?? "Não foi possível atualizar o compromisso."
      );
      setLoading(false);
      return;
    }

    setCurrent(result.data);
    setLoading(false);
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const result = await deleteAgendaEvent(companyId, current.id);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push(ROUTES.agenda);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{current.title}</CardTitle>
            <CardDescription>
              {agendaStatusLabel(current.status)}
              {current.location ? ` · ${current.location}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={agendaEditPath(current.id)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
            {current.status !== AGENDA_STATUS.completed &&
            current.status !== AGENDA_STATUS.canceled &&
            current.status !== "cancelled" ? (
              <Button
                type="button"
                disabled={loading}
                onClick={() => void runStatusAction("complete")}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Concluir
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void runStatusAction("reopen")}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Reabrir
              </Button>
            )}
            {current.status !== AGENDA_STATUS.canceled &&
            current.status !== "cancelled" &&
            current.status !== AGENDA_STATUS.completed ? (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void runStatusAction("cancel")}
              >
                <XCircle className="h-4 w-4" />
                Cancelar
              </Button>
            ) : null}
            {!confirmingDelete ? (
              <Button
                variant="destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            ) : (
              <>
                <Button
                  variant="destructive"
                  disabled={loading}
                  onClick={() => void handleDelete()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Confirmar exclusão
                </Button>
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Voltar
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <InfoItem
            label="Data inicial"
            value={formatAgendaDate(current.start_date)}
          />
          <InfoItem label="Horário inicial" value={startTime} />
          <InfoItem
            label="Data final"
            value={formatAgendaDate(current.end_date)}
          />
          <InfoItem label="Horário final" value={endTime} />
          <InfoItem
            label="Status"
            value={agendaStatusLabel(current.status)}
            className={agendaStatusTone(current.status)}
          />
          <InfoItem label="Local" value={current.location} />
          <InfoItem
            label="Responsável"
            value={current.assigned_user?.full_name}
          />
          <InfoItem
            label="Cliente relacionado"
            value={
              current.related_customer?.trade_name ||
              current.related_customer?.full_name
            }
          />
          <InfoItem
            label="Criado por"
            value={current.created_by_user?.full_name}
          />
          <InfoItem
            label="Dia inteiro"
            value={current.all_day ? "Sim" : "Não"}
          />
          <div className="sm:col-span-2">
            <InfoItem label="Descrição" value={current.description} />
          </div>
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href={ROUTES.agenda}>Voltar para agenda</Link>
      </Button>
    </div>
  );
}
