"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/lib/constants";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/lib/sales/format";
import { scheduleDifference } from "@/lib/sales/installments";

export type DraftInstallmentRow = {
  key: string;
  installment_number: number;
  due_date: string;
  amount: string;
  payment_method: string;
};

type SaleInstallmentSectionProps = {
  installmentCount: string;
  firstDueDate: string;
  paymentMethod: string;
  rows: DraftInstallmentRow[];
  saleTotal: number;
  planMode: "none" | "auto" | "manual";
  divergenceWarning: boolean;
  disabled?: boolean;
  onInstallmentCountChange: (value: string) => void;
  onFirstDueDateChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onGenerate: () => void;
  onRowChange: (key: string, patch: Partial<DraftInstallmentRow>) => void;
  error?: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function SaleInstallmentSection({
  installmentCount,
  firstDueDate,
  paymentMethod,
  rows,
  saleTotal,
  planMode,
  divergenceWarning,
  disabled,
  onInstallmentCountChange,
  onFirstDueDateChange,
  onPaymentMethodChange,
  onGenerate,
  onRowChange,
  error,
}: SaleInstallmentSectionProps) {
  const totalParcelado = Number(
    (
      rows.reduce(
        (sum, row) =>
          sum + Math.round(parseCurrencyInput(row.amount || "0") * 100),
        0
      ) / 100
    ).toFixed(2)
  );
  const diff = scheduleDifference(
    saleTotal,
    rows.map((row) => ({ amount: parseCurrencyInput(row.amount || "0") }))
  );
  const hasDiff = Math.round(diff * 100) !== 0;
  const hasRows = rows.length > 0;
  const buttonLabel =
    planMode === "none" || !hasRows ? "Gerar parcelas" : "Recalcular parcelas";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="installment_count">Quantidade de parcelas *</Label>
          <Input
            id="installment_count"
            type="number"
            min={2}
            step={1}
            value={installmentCount}
            onChange={(e) => onInstallmentCountChange(e.target.value)}
            disabled={disabled}
            placeholder="Ex.: 3"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="first_due_date">Primeira data de vencimento *</Label>
          <Input
            id="first_due_date"
            type="date"
            value={firstDueDate}
            onChange={(e) => onFirstDueDateChange(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="default_payment_method">Forma padrão</Label>
          <Select
            id="default_payment_method"
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">Selecione</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onGenerate}
            disabled={disabled}
          >
            <RefreshCw className="h-4 w-4" />
            {buttonLabel}
          </Button>
        </div>
      </div>

      {divergenceWarning ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
          O total da venda mudou e o plano de parcelas foi editado manualmente.
          Use <strong>Recalcular parcelas</strong> ou ajuste os valores até a
          diferença voltar a zero. Nada será sobrescrito automaticamente.
        </div>
      ) : null}

      {planMode === "manual" && hasRows && !divergenceWarning ? (
        <p className="text-xs text-muted-foreground">
          Plano com edição manual. Alterações de total não recalculam as
          parcelas automaticamente.
        </p>
      ) : null}

      <FieldError message={error} />

      {hasRows ? (
        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Parcela</th>
                  <th className="px-3 py-2.5 font-medium">Vencimento</th>
                  <th className="px-3 py-2.5 font-medium">Valor</th>
                  <th className="px-3 py-2.5 font-medium">Forma</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      {row.installment_number}/{rows.length}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        value={row.due_date}
                        onChange={(e) =>
                          onRowChange(row.key, { due_date: e.target.value })
                        }
                        disabled={disabled}
                        className="h-9"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.amount}
                        onChange={(e) =>
                          onRowChange(row.key, {
                            amount: formatCurrencyInput(e.target.value),
                          })
                        }
                        disabled={disabled}
                        placeholder="0,00"
                        className="h-9"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={row.payment_method}
                        onChange={(e) =>
                          onRowChange(row.key, {
                            payment_method: e.target.value,
                          })
                        }
                        disabled={disabled}
                        className="h-9"
                      >
                        <option value="">Selecione</option>
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Informe a quantidade e a primeira data, depois gere as parcelas.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">Total da venda</p>
          <p className="text-sm font-semibold">{formatCurrency(saleTotal)}</p>
        </div>
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">Total parcelado</p>
          <p className="text-sm font-semibold">
            {formatCurrency(totalParcelado)}
          </p>
        </div>
        <div
          className={`rounded-md border px-3 py-2 ${
            hasDiff
              ? "border-destructive/50 bg-destructive/10"
              : "bg-muted/30"
          }`}
        >
          <p className="text-xs text-muted-foreground">Diferença</p>
          <p
            className={`text-sm font-semibold ${
              hasDiff ? "text-destructive" : ""
            }`}
          >
            {formatCurrency(diff)}
          </p>
        </div>
      </div>
    </div>
  );
}
