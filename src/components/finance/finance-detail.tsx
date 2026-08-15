"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FINANCIAL_ENTRY_TYPE_OPTIONS,
  FINANCIAL_STATUS,
  FINANCIAL_STATUS_OPTIONS,
  PAYMENT_METHODS,
  ROUTES,
  financeDetailPath,
  financeEditPath,
} from "@/lib/constants";
import {
  deleteFinancialEntry,
  markFinancialEntrySettled,
  type FinancialEntryWithRelations,
} from "@/lib/finance/actions";
import { canHardDeleteFinancialEntry } from "@/lib/finance/delete-guard";
import { formatCurrency, formatDateBR } from "@/lib/finance/format";
import { useTenant } from "@/providers/tenant-provider";
import { PERMISSION_MODULES } from "@/lib/users/permissions";

type FinanceDetailProps = {
  entry: FinancialEntryWithRelations;
  companyId: string;
};

function labelFromOptions(
  options: readonly { value: string; label: string }[],
  value: string
) {
  return options.find((item) => item.value === value)?.label ?? value;
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value || "—"}</p>
    </div>
  );
}

export function FinanceDetail({ entry, companyId }: FinanceDetailProps) {
  const router = useRouter();
  const { editableModules, deletableModules } = useTenant();
  const canEdit = editableModules.includes(PERMISSION_MODULES.finance);
  const canDelete =
    deletableModules.includes(PERMISSION_MODULES.finance) &&
    canHardDeleteFinancialEntry(entry);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPayable = entry.entry_type === "payable";
  const canSettle =
    canEdit &&
    (entry.status === FINANCIAL_STATUS.pending ||
      entry.status === FINANCIAL_STATUS.overdue);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const result = await deleteFinancialEntry(companyId, entry.id);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push(ROUTES.finance);
    router.refresh();
  }

  async function handleSettle() {
    setSettling(true);
    setError(null);
    setSuccess(null);

    const result = await markFinancialEntrySettled(companyId, entry);

    if (result.error) {
      setError(result.error.message);
      setSettling(false);
      return;
    }

    setSuccess(
      isPayable
        ? "Lançamento marcado como pago."
        : "Lançamento marcado como recebido."
    );
    setSettling(false);
    window.location.assign(financeDetailPath(entry.id));
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md bg-primary/10 p-3 text-sm text-foreground">
          {success}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{entry.description}</CardTitle>
            <CardDescription>
              {labelFromOptions(FINANCIAL_ENTRY_TYPE_OPTIONS, entry.entry_type)}{" "}
              · {labelFromOptions(FINANCIAL_STATUS_OPTIONS, entry.status)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSettle ? (
              <Button
                variant="secondary"
                disabled={settling}
                onClick={() => void handleSettle()}
              >
                {settling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isPayable ? "Marcar como pago" : "Marcar como recebido"}
              </Button>
            ) : null}
            {canEdit ? (
              <Button asChild variant="outline">
                <Link href={financeEditPath(entry.id)}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            ) : null}
            {canDelete ? (
              !confirmingDelete ? (
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
                    Cancelar
                  </Button>
                </>
              )
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Valor" value={formatCurrency(entry.amount)} />
          <InfoItem label="Categoria" value={entry.category} />
          <InfoItem
            label={isPayable ? "Fornecedor" : "Cliente"}
            value={
              entry.party_name ||
              entry.supplier?.full_name ||
              entry.customer?.full_name
            }
          />
          <InfoItem
            label="Data de emissão"
            value={formatDateBR(entry.issue_date)}
          />
          <InfoItem
            label="Data de vencimento"
            value={formatDateBR(entry.due_date)}
          />
          <InfoItem
            label="Data de pagamento/recebimento"
            value={formatDateBR(entry.payment_date)}
          />
          <InfoItem
            label="Forma de pagamento"
            value={
              entry.payment_method
                ? labelFromOptions(PAYMENT_METHODS, entry.payment_method)
                : null
            }
          />
          <InfoItem
            label="Número do documento"
            value={entry.document_number}
          />
          <InfoItem
            label="Recorrente"
            value={entry.is_recurring ? "Sim" : "Não"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">
            {entry.notes || "Nenhuma observação cadastrada."}
          </p>
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link href={ROUTES.finance}>Voltar para o financeiro</Link>
        </Button>
      </div>
    </div>
  );
}
