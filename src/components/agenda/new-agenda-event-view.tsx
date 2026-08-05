"use client";

import { AgendaForm } from "@/components/agenda/agenda-form";
import { AgendaPageShell } from "@/components/agenda/agenda-page-shell";

export function NewAgendaEventView() {
  return (
    <AgendaPageShell
      title="Novo compromisso"
      description="Cadastre um compromisso vinculado à empresa ativa"
    >
      {(companyId) => <AgendaForm companyId={companyId} mode="create" />}
    </AgendaPageShell>
  );
}
