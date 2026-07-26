"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Pencil,
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
  PAYMENT_METHODS,
  PURCHASE_STATUS,
  ROUTES,
  financeDetailPath,
  purchaseEditPath,
} from "@/lib/constants";
import {
  cancelPurchase,
  confirmPurchase,
  deletePurchaseDraft,
  type PurchaseWithRelations,
} from "@/lib/purchases/actions";
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  paymentMethodLabel,
  purchaseStatusLabel,
} from "@/lib/purchases/format";
import { formatStockQuantity } from "@/lib/products/format";

type PurchaseDetailProps = {
  purchase: PurchaseWithRelations;
  companyId: string;
};

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

export function PurchaseDetail({ purchase, companyId }: PurchaseDetailProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [current, setCurrent] = useState(purchase);

  const isDraft = current.status === PURCHASE_STATUS.draft;
  const isConfirmed = current.status === PURCHASE_STATUS.confirmed;

  async function handleConfirm() {
    setLoadingAction("confirm");
    setError(null);
    setSuccess(null);

    const result = await confirmPurchase(companyId, current.id);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível confirmar a compra.");
      setLoadingAction(null);
      return;
    }

    setCurrent(result.data);
    setSuccess(
      "Compra confirmada. Estoque e conta a pagar foram gerados com sucesso."
    );
    setLoadingAction(null);
    router.refresh();
  }

  async function handleCancel() {
    setLoadingAction("cancel");
    setError(null);
    setSuccess(null);

    const result = await cancelPurchase(companyId, current.id);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível cancelar a compra.");
      setLoadingAction(null);
      setConfirmingCancel(false);
      return;
    }

    setCurrent(result.data);
    setSuccess("Compra cancelada. Estoque estornado e financeiro atualizado.");
    setConfirmingCancel(false);
    setLoadingAction(null);
    router.refresh();
  }

  async function handleDelete() {
    setLoadingAction("delete");
    setError(null);

    const result = await deletePurchaseDraft(companyId, current.id);

    if (result.error) {
      setError(result.error.message);
      setLoadingAction(null);
      return;
    }

    router.push(ROUTES.purchases);
    router.refresh();
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
            <CardTitle>
              Compra {current.document_number || current.id.slice(0, 8)}
            </CardTitle>
            <CardDescription>
              {purchaseStatusLabel(current.status)} ·{" "}
              {formatDateBR(current.purchase_date)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {isDraft ? (
              <>
                <Button asChild variant="outline">
                  <Link href={purchaseEditPath(current.id)}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Link>
                </Button>
                <Button
                  onClick={() => void handleConfirm()}
                  disabled={loadingAction !== null}
                >
                  {loadingAction === "confirm" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Confirmar compra
                </Button>
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
                      disabled={loadingAction !== null}
                      onClick={() => void handleDelete()}
                    >
                      {loadingAction === "delete" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Confirmar exclusão
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Voltar
                    </Button>
                  </>
                )}
              </>
            ) : null}

            {isConfirmed ? (
              !confirmingCancel ? (
                <Button
                  variant="destructive"
                  onClick={() => setConfirmingCancel(true)}
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar compra
                </Button>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    disabled={loadingAction !== null}
                    onClick={() => void handleCancel()}
                  >
                    {loadingAction === "cancel" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Confirmar cancelamento
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmingCancel(false)}
                  >
                    Voltar
                  </Button>
                </>
              )
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="Fornecedor"
            value={
              current.supplier?.trade_name || current.supplier?.full_name
            }
          />
          <InfoItem
            label="Status"
            value={purchaseStatusLabel(current.status)}
          />
          <InfoItem
            label="Documento / NF"
            value={current.document_number}
          />
          <InfoItem
            label="Data da compra"
            value={formatDateBR(current.purchase_date)}
          />
          <InfoItem
            label="Data de vencimento"
            value={formatDateBR(current.due_date)}
          />
          <InfoItem
            label="Forma de pagamento"
            value={paymentMethodLabel(current.payment_method, PAYMENT_METHODS)}
          />
          <InfoItem
            label="Subtotal dos itens"
            value={formatCurrency(current.items_subtotal)}
          />
          <InfoItem
            label="Desconto geral"
            value={formatCurrency(current.discount_amount)}
          />
          <InfoItem
            label="Frete"
            value={formatCurrency(current.freight_amount)}
          />
          <InfoItem
            label="Valor total"
            value={formatCurrency(current.total_amount)}
          />
          <InfoItem
            label="Confirmada em"
            value={formatDateTimeBR(current.confirmed_at)}
          />
          <InfoItem
            label="Cancelada em"
            value={formatDateTimeBR(current.cancelled_at)}
          />
          {current.financial_entry_id ? (
            <div>
              <p className="text-xs text-muted-foreground">Financeiro</p>
              <Link
                href={financeDetailPath(current.financial_entry_id)}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver conta a pagar
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
          <CardDescription>
            {current.items.length} item(ns) nesta compra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Qtd</th>
                  <th className="px-4 py-3 font-medium">Unitário</th>
                  <th className="px-4 py-3 font-medium">Desconto</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Estoque</th>
                </tr>
              </thead>
              <tbody>
                {current.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {item.product?.name ?? "Produto"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.product?.internal_code ||
                          item.product?.sku ||
                          "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {formatStockQuantity(item.quantity, item.product?.unit)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(item.unit_cost)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(item.discount_amount)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(item.line_total)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {item.tracks_stock_snapshot === false
                        ? "Não controla"
                        : item.stock_movement_id
                          ? "Entrada gerada"
                          : item.product?.tracks_stock
                            ? "Controla"
                            : "Não controla"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">
            {current.notes || "Nenhuma observação cadastrada."}
          </p>
          {current.cancelled_reason ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Motivo do cancelamento: {current.cancelled_reason}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link href={ROUTES.purchases}>Voltar para a lista</Link>
        </Button>
      </div>
    </div>
  );
}
