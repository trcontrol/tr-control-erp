"use client";

import { OpportunityForm } from "@/components/funnel/opportunity-form";
import { FunnelPageShell } from "@/components/funnel/funnel-page-shell";

export function NewOpportunityView() {
  return (
    <FunnelPageShell
      title="Nova oportunidade"
      description="Cadastre uma oportunidade vinculada à empresa ativa"
    >
      {(companyId) => <OpportunityForm companyId={companyId} mode="create" />}
    </FunnelPageShell>
  );
}
