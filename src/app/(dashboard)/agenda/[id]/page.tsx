"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AgendaEventDetail } from "@/components/agenda/agenda-event-detail";
import { AgendaPageShell } from "@/components/agenda/agenda-page-shell";
import {
  getAgendaEvent,
  type AgendaEventWithRelations,
} from "@/lib/agenda/actions";

export default function AgendaEventDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <AgendaPageShell
      title="Detalhes do compromisso"
      description="Visualização completa do compromisso"
    >
      {(companyId) => (
        <AgendaEventDetailLoader companyId={companyId} eventId={params.id} />
      )}
    </AgendaPageShell>
  );
}

function AgendaEventDetailLoader({
  companyId,
  eventId,
}: {
  companyId: string;
  eventId: string;
}) {
  const [event, setEvent] = useState<AgendaEventWithRelations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await getAgendaEvent(companyId, eventId);

      if (!active) return;

      if (result.error || !result.data) {
        setEvent(null);
        setError(result.error?.message ?? "Compromisso não encontrado.");
        setLoading(false);
        return;
      }

      setEvent(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [companyId, eventId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando compromisso...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error ?? "Compromisso não encontrado."}
      </div>
    );
  }

  return <AgendaEventDetail event={event} companyId={companyId} />;
}
