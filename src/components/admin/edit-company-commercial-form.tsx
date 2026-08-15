"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  getAdminCompanySeatUsageAction,
  updateCompanyCommercialAction,
} from "@/lib/admin/companies-admin-actions";
import {
  COMPANY_PLAN_OPTIONS,
  COMPANY_STATUS_OPTIONS,
  type AdminCompanyListItem,
} from "@/lib/admin/companies-admin-shared";
import {
  COMPANY_STATUSES,
  type CompanyPlan,
  type CompanyStatus,
} from "@/lib/constants";
import {
  canFitSeatUsage,
  maxUsersForPlan,
  type SeatUsageSnapshot,
} from "@/lib/plans/limits";
import { formatCnpj } from "@/lib/companies/format";
import {
  isPlanDowngrade,
  isPlanUpgrade,
  normalizeCompanyPlan,
} from "@/lib/plans/entitlements";

type EditCompanyCommercialFormProps = {
  company: AdminCompanyListItem;
  onCancel: () => void;
  onSuccess: (message: string) => void;
};

function parseStatus(value: string): CompanyStatus {
  return value === COMPANY_STATUSES.suspended
    ? COMPANY_STATUSES.suspended
    : COMPANY_STATUSES.active;
}

export function EditCompanyCommercialForm({
  company,
  onCancel,
  onSuccess,
}: EditCompanyCommercialFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<CompanyPlan>(
    normalizeCompanyPlan(company.plan)
  );
  const [status, setStatus] = useState<CompanyStatus>(
    parseStatus(company.status)
  );
  const [downgradeAck, setDowngradeAck] = useState(false);
  const [seats, setSeats] = useState<SeatUsageSnapshot | null>(null);
  const [seatsLoading, setSeatsLoading] = useState(true);

  const currentPlan = normalizeCompanyPlan(company.plan);

  useEffect(() => {
    setPlan(normalizeCompanyPlan(company.plan));
    setStatus(parseStatus(company.status));
    setDowngradeAck(false);
    setError(null);
  }, [company]);

  useEffect(() => {
    let cancelled = false;
    setSeatsLoading(true);
    void getAdminCompanySeatUsageAction(company.id).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setSeats(null);
        setSeatsLoading(false);
        return;
      }
      setSeats(result);
      setSeatsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [company.id]);

  const upgrading = useMemo(
    () => isPlanUpgrade(currentPlan, plan),
    [currentPlan, plan]
  );
  const downgrading = useMemo(
    () => isPlanDowngrade(currentPlan, plan),
    [currentPlan, plan]
  );

  const seatBlock = useMemo(() => {
    if (!downgrading || !seats) return null;
    if (canFitSeatUsage(seats, plan)) return null;
    const maxUsers = maxUsersForPlan(plan);
    const toFree = Math.max(0, seats.usedSeats - maxUsers);
    return { maxUsers, used: seats.usedSeats, toFree, seats };
  }, [downgrading, seats, plan]);

  useEffect(() => {
    if (!downgrading) setDowngradeAck(false);
  }, [downgrading]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (seatBlock) {
      setError(
        `Não é possível concluir o downgrade. O plano destino permite até ${seatBlock.maxUsers} usuários e esta empresa possui ${seatBlock.used} acessos em uso. Libere ${seatBlock.toFree} vaga(s) em Usuários antes de continuar.`
      );
      return;
    }

    if (downgrading && !downgradeAck) {
      setError("Confirme que entende o impacto do downgrade para continuar.");
      return;
    }

    startTransition(async () => {
      const result = await updateCompanyCommercialAction({
        companyId: company.id,
        plan,
        status,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      onSuccess(result.message);
    });
  }

  return (
    <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
      <div className="grid gap-3 rounded-xl border border-[var(--brand-navy)]/10 bg-muted/30 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nome
          </p>
          <p className="mt-1 font-medium text-[var(--brand-navy)]">
            {company.name}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Slug
          </p>
          <p className="mt-1 text-muted-foreground">{company.slug}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            CNPJ
          </p>
          <p className="mt-1 text-muted-foreground">
            {company.cnpj ? formatCnpj(company.cnpj) : "—"}
          </p>
        </div>
      </div>

      {!seatsLoading && seats ? (
        <p className="rounded-md border border-[var(--brand-navy)]/10 bg-white px-3 py-2 text-sm text-[var(--brand-navy)]">
          Uso atual de usuários:{" "}
          <span className="font-semibold">
            {seats.usedSeats} de {seats.maxUsers}
          </span>{" "}
          ({seats.activeMembers} ativos
          {seats.pendingValidInvites > 0
            ? ` + ${seats.pendingValidInvites} convite${seats.pendingValidInvites === 1 ? "" : "s"} pendente${seats.pendingValidInvites === 1 ? "" : "s"}`
            : ""}
          ). Convites pendentes também reservam vaga.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-company-plan">Plano</Label>
          <Select
            id="edit-company-plan"
            value={plan}
            onChange={(event) =>
              setPlan(normalizeCompanyPlan(event.target.value))
            }
            disabled={pending}
          >
            {COMPANY_PLAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-company-status">Status</Label>
          <Select
            id="edit-company-status"
            value={status}
            onChange={(event) => setStatus(parseStatus(event.target.value))}
            disabled={pending}
          >
            {COMPANY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {upgrading ? (
        <p className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-950">
          Novos módulos ficarão disponíveis após a atualização.
        </p>
      ) : null}

      {seatBlock ? (
        <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
          <p className="font-medium">Downgrade bloqueado pelo limite de usuários</p>
          <p>
            O plano destino permite até {seatBlock.maxUsers} usuários
            ativos/reservados e esta empresa possui {seatBlock.used} acessos em
            uso
            {seatBlock.seats.pendingValidInvites > 0
              ? ` (${seatBlock.seats.activeMembers} ativos + ${seatBlock.seats.pendingValidInvites} convites pendentes)`
              : ""}
            .
          </p>
          <p>
            É necessário liberar {seatBlock.toFree} vaga
            {seatBlock.toFree === 1 ? "" : "s"} antes de concluir o downgrade.
            Acesse o módulo Usuários da empresa, inative usuários e/ou cancele
            convites pendentes. A escolha de quem permanece é do tenant — não
            inativamos usuários daqui.
          </p>
        </div>
      ) : null}

      {downgrading && !seatBlock ? (
        <div className="space-y-3 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-3 text-sm text-amber-950">
          <p>
            Este downgrade removerá o acesso imediato aos módulos que não fazem
            parte do novo plano. Os dados históricos não serão apagados.
          </p>
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border"
              checked={downgradeAck}
              onChange={(event) => setDowngradeAck(event.target.checked)}
              disabled={pending}
            />
            <span>Entendo o impacto do downgrade</span>
          </label>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Observação: nesta versão, o status Suspensa ainda não bloqueia o acesso
        ao sistema.
      </p>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            pending ||
            Boolean(seatBlock) ||
            (downgrading && !downgradeAck && !seatBlock)
          }
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar"
          )}
        </Button>
      </div>
    </form>
  );
}
