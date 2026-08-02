"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { OpportunityForm } from "@/components/funnel/opportunity-form";
import { FunnelPageShell } from "@/components/funnel/funnel-page-shell";
import {
  getOpportunity,
  type OpportunityWithRelations,
} from "@/lib/funnel/actions";

export default function EditOpportunityPage() {
  const params = useParams<{ id: string }>();

  return (
    <FunnelPageShell
      title="Editar oportunidade"
      description="Atualize os dados da oportunidade da empresa ativa"
    >
      {(companyId) => (
        <OpportunityEditLoader
          companyId={companyId}
          opportunityId={params.id}
        />
      )}
    </FunnelPageShell>
  );
}

function OpportunityEditLoader({
  companyId,
  opportunityId,
}: {
  companyId: string;
  opportunityId: string;
}) {
  const [opportunity, setOpportunity] =
    useState<OpportunityWithRelations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const result = await getOpportunity(companyId, opportunityId);

      if (!active) return;

      if (result.error || !result.data) {
        setOpportunity(null);
        setError(result.error?.message ?? "Oportunidade não encontrada.");
        setLoading(false);
        return;
      }

      setOpportunity(result.data);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [companyId, opportunityId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando oportunidade...
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error ?? "Oportunidade não encontrada."}
      </div>
    );
  }

  return (
    <OpportunityForm
      companyId={companyId}
      opportunity={opportunity}
      mode="edit"
    />
  );
}
