"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteCompanyForPlatformAdminAction,
  getAdminCompanyDeletionCountsAction,
} from "@/lib/admin/companies-admin-actions";
import {
  companyPlanLabel,
  companyStatusLabel,
  type AdminCompanyDeletionCounts,
  type AdminCompanyListItem,
} from "@/lib/admin/companies-admin-shared";

type DeleteCompanyDialogProps = {
  company: AdminCompanyListItem;
  onCancel: () => void;
  onSuccess: (result: { message: string; storageWarning: boolean }) => void;
};

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--brand-navy)]/8 py-1.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-[var(--brand-navy)]">
        {value}
      </span>
    </div>
  );
}

export function DeleteCompanyDialog({
  company,
  onCancel,
  onSuccess,
}: DeleteCompanyDialogProps) {
  const [pending, startTransition] = useTransition();
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<AdminCompanyDeletionCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCountsLoading(true);
    setCountsError(null);
    setConfirmName("");
    setError(null);

    void getAdminCompanyDeletionCountsAction(company.id).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setCounts(null);
        setCountsError(result.error);
        setCountsLoading(false);
        return;
      }
      setCounts(result);
      setCountsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [company.id]);

  const expectedName = (counts?.name ?? company.name).trim();
  const nameMatches =
    confirmName.trim().length > 0 && confirmName.trim() === expectedName;
  const canSubmit = nameMatches && !pending && !countsLoading && !countsError;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteCompanyForPlatformAdminAction({
        companyId: company.id,
        confirmName: confirmName.trim(),
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      onSuccess({
        message: result.message,
        storageWarning: result.storageWarning,
      });
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="delete-company-dialog"
    >
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Esta ação é irreversível. Todos os dados desta empresa serão removidos
        permanentemente. As contas de acesso dos usuários não serão excluídas e
        poderão continuar vinculadas a outras empresas.
      </div>

      {countsLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando contagens…
        </div>
      ) : null}

      {countsError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {countsError}
        </div>
      ) : null}

      {counts ? (
        <div className="space-y-3">
          <div className="grid gap-2 rounded-lg border border-[var(--brand-navy)]/10 bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Nome
              </p>
              <p className="font-medium text-[var(--brand-navy)]">{counts.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Slug
              </p>
              <p className="font-medium text-[var(--brand-navy)]">{counts.slug}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Plano
              </p>
              <p className="font-medium text-[var(--brand-navy)]">
                {companyPlanLabel(counts.plan)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <p className="font-medium text-[var(--brand-navy)]">
                {companyStatusLabel(counts.status)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--brand-navy)]/10 px-3 py-1">
            <CountRow label="Usuários ativos" value={counts.activeMembers} />
            <CountRow label="Convites pendentes" value={counts.pendingInvites} />
            <CountRow label="Clientes" value={counts.customers} />
            <CountRow label="Fornecedores" value={counts.suppliers} />
            <CountRow label="Produtos" value={counts.products} />
            <CountRow label="Compras" value={counts.purchases} />
            <CountRow label="Vendas" value={counts.sales} />
            <CountRow
              label="Lançamentos financeiros"
              value={counts.financialEntries}
            />
            <CountRow label="Tarefas" value={counts.tasks} />
            <CountRow label="Eventos de agenda" value={counts.agendaEvents} />
            <CountRow label="Oportunidades" value={counts.opportunities} />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="confirm-company-name">
          Digite <span className="font-semibold">{expectedName}</span> para
          confirmar
        </Label>
        <Input
          id="confirm-company-name"
          value={confirmName}
          onChange={(event) => setConfirmName(event.target.value)}
          autoComplete="off"
          disabled={pending || countsLoading || Boolean(countsError)}
          placeholder="Nome exato da empresa"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="destructive" disabled={!canSubmit}>
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Excluir empresa permanentemente
        </Button>
      </div>
    </form>
  );
}
