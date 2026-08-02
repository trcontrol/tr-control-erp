"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  OPPORTUNITY_STAGE_OPTIONS,
  ROUTES,
  opportunityEditPath,
} from "@/lib/constants";
import {
  deleteOpportunity,
  updateOpportunityStage,
  type OpportunityWithRelations,
} from "@/lib/funnel/actions";
import {
  customerDisplayName,
  formatOpportunityCurrency,
  formatOpportunityDate,
  isNextActionOverdue,
  opportunityStageAccent,
  opportunityStageLabel,
  opportunityStatusLabel,
} from "@/lib/funnel/format";
import { cn } from "@/lib/utils";

type OpportunityDetailProps = {
  opportunity: OpportunityWithRelations;
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

export function OpportunityDetail({
  opportunity,
  companyId,
}: OpportunityDetailProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(opportunity);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accent = opportunityStageAccent(current.stage);
  const overdue = isNextActionOverdue({
    nextActionDate: current.next_action_date,
    stage: current.stage,
    status: current.status,
  });

  async function handleStageChange(stage: string) {
    if (stage === current.stage) return;

    setLoading(true);
    setError(null);

    const result = await updateOpportunityStage(companyId, current.id, stage);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível alterar a etapa.");
      setLoading(false);
      return;
    }

    setCurrent(result.data);
    setLoading(false);
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const result = await deleteOpportunity(companyId, current.id);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push(ROUTES.funnel);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                accent.soft,
                accent.text
              )}
            >
              {opportunityStageLabel(current.stage)}
            </span>
            <span className="text-xs text-muted-foreground">
              {opportunityStatusLabel(current.status)}
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--brand-navy)]">
            {current.title}
          </h2>
          <p className="text-muted-foreground">
            {customerDisplayName(current.customer)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={opportunityEditPath(current.id)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
          {!confirmingDelete ? (
            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          ) : (
            <>
              <Button
                type="button"
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
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => setConfirmingDelete(false)}
              >
                Cancelar
              </Button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados da oportunidade</CardTitle>
          <CardDescription>
            Informações comerciais vinculadas à empresa ativa.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <InfoItem
            label="Valor estimado"
            value={formatOpportunityCurrency(current.estimated_value)}
            className="text-[var(--brand-gold)]"
          />
          <InfoItem
            label="Responsável"
            value={current.assigned_user?.full_name}
          />
          <InfoItem
            label="Próxima ação"
            value={formatOpportunityDate(current.next_action_date)}
            className={overdue ? "text-[var(--brand-coral)]" : undefined}
          />
          <InfoItem
            label="Criado por"
            value={current.created_by_user?.full_name}
          />
          <div className="sm:col-span-2 space-y-2">
            <p className="text-xs text-muted-foreground">Etapa</p>
            <Select
              value={current.stage}
              disabled={loading}
              onChange={(event) => void handleStageChange(event.target.value)}
              className="max-w-sm"
            >
              {OPPORTUNITY_STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <InfoItem label="Observações" value={current.notes} />
          </div>
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link href={ROUTES.funnel}>Voltar ao funil</Link>
        </Button>
      </div>
    </div>
  );
}
