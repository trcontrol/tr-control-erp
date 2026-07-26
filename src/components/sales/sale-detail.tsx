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
  ROUTES,
  SALE_STATUS,
  financeDetailPath,
  saleEditPath,
} from "@/lib/constants";
import {
  cancelSale,
  confirmSale,
  deleteSaleDraft,
  type SaleWithRelations,
} from "@/lib/sales/actions";
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  paymentMethodLabel,
  saleStatusLabel,
} from "@/lib/sales/format";
import { formatStockQuantity } from "@/lib/products/format";

type SaleDetailProps = {
  sale: SaleWithRelations;
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

export function SaleDetail({ sale, companyId }: SaleDetailProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [current, setCurrent] = useState(sale);

  const isDraft = current.status === SALE_STATUS.draft;
  const isConfirmed = current.status === SALE_STATUS.confirmed;

  async function handleConfirm() {
    setLoadingAction("confirm");
    setError(null);
    setSuccess(null);

    const result = await confirmSale(companyId, current.id);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível confirmar a venda.");
      setLoadingAction(null);
      return;
    }

    setCurrent(result.data);
    setSuccess(
      "Venda confirmada. Estoque e conta a receber foram gerados com sucesso."
    );
    setLoadingAction(null);
    router.refresh();
  }

  async function handleCancel() {
    setLoadingAction("cancel");
    setError(null);
    setSuccess(null);

    const result = await cancelSale(companyId, current.id);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível cancelar a venda.");
      setLoadingAction(null);
      setConfirmingCancel(false);
      return;
    }

    setCurrent(result.data);
    setSuccess("Venda cancelada. Estoque estornado e financeiro atualizado.");
    setConfirmingCancel(false);
    setLoadingAction(null);
    router.refresh();
  }

  async function handleDelete() {
    setLoadingAction("delete");
    setError(null);

    const result = await deleteSaleDraft(companyId, current.id);

    if (result.error) {
      setError(result.error.message);
      setLoadingAction(null);
      return;
    }

    router.push(ROUTES.sales);
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
              Venda {current.document_number || current.id.slice(0, 8)}
            </CardTitle>
            <CardDescription>
              {saleStatusLabel(current.status)} ·{" "}
              {formatDateBR(current.sale_date)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {isDraft ? (
              <>
                <Button asChild variant="outline">
                  <Link href={saleEditPath(current.id)}>
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
                  Confirmar venda
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
                  Cancelar venda
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
            label="Cliente"
            value={
              current.customer?.trade_name || current.customer?.full_name
            }
          />
          <InfoItem label="Status" value={saleStatusLabel(current.status)} />
          <InfoItem
            label="Pedido / Documento"
            value={current.document_number}
          />
          <InfoItem
            label="Data da venda"
            value={formatDateBR(current.sale_date)}
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
                Ver conta a receber
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
          <CardDescription>
            {current.items.length} item(ns) nesta venda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto / Serviço</th>
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
                        {item.product?.name ?? "Item"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.product?.product_type === "service"
                          ? "Serviço"
                          : "Produto"}
                        {item.product?.internal_code || item.product?.sku
                          ? ` · ${item.product?.internal_code || item.product?.sku}`
                          : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {formatStockQuantity(item.quantity, item.product?.unit)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(item.discount_amount)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(item.line_total)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {item.tracks_stock_snapshot
                        ? item.stock_movement_id
                          ? "Saída gerada"
                          : "Controla"
                        : "Sem baixa"}
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
          <Link href={ROUTES.sales}>Voltar para a lista</Link>
        </Button>
      </div>
    </div>
  );
}
