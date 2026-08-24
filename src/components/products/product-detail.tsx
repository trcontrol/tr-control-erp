"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Package, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PRODUCT_STATUS_OPTIONS,
  ROUTES,
  TRACK_STOCK_OPTIONS,
  productEditPath,
  stockProductHistoryPath,
} from "@/lib/constants";
import { deleteProduct } from "@/lib/products/actions";
import {
  calculateProfitMargin,
  formatCurrency,
  formatPercent,
  formatProductType,
  formatStockQuantity,
  isLowStock,
} from "@/lib/products/format";
import type { Product } from "@/types/database";

type ProductDetailProps = {
  product: Product;
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
  emphasize,
}: {
  label: string;
  value?: string | null;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          emphasize
            ? "font-medium text-destructive break-words"
            : "font-medium break-words"
        }
      >
        {value || "—"}
      </p>
    </div>
  );
}

export function ProductDetail({ product, companyId }: ProductDetailProps) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lowStock = isLowStock(product);
  const margin = calculateProfitMargin(product.cost_price, product.sale_price);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const result = await deleteProduct(companyId, product.id);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push(ROUTES.products);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {product.tracks_stock !== false && lowStock ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Estoque atual (
            {formatStockQuantity(product.current_stock, product.unit)}) está
            abaixo do mínimo (
            {formatStockQuantity(product.min_stock, product.unit)}).
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 rounded-xl">
              {product.image_url ? (
                <AvatarImage
                  src={product.image_url}
                  alt={product.name}
                  className="rounded-xl object-cover"
                />
              ) : null}
              <AvatarFallback className="rounded-xl">
                <Package className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>
                {formatProductType(product.product_type)}
                {" · "}
                {labelFromOptions(PRODUCT_STATUS_OPTIONS, product.status)}
                {product.category ? ` · ${product.category}` : ""}
                {product.brand ? ` · ${product.brand}` : ""}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.tracks_stock !== false ? (
              <Button asChild variant="outline">
                <Link href={stockProductHistoryPath(product.id)}>
                  Histórico de estoque
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={productEditPath(product.id)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
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
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="Tipo"
            value={formatProductType(product.product_type)}
          />
          <InfoItem
            label="Controlar estoque?"
            value={labelFromOptions(
              TRACK_STOCK_OPTIONS,
              product.tracks_stock === false ? "false" : "true"
            )}
          />
          <InfoItem label="Código interno" value={product.internal_code} />
          <InfoItem label="SKU" value={product.sku} />
          <InfoItem label="Código de barras" value={product.barcode} />
          <InfoItem label="Unidade" value={product.unit} />
          <InfoItem label="NCM" value={product.ncm} />
          <InfoItem
            label="Preço de custo"
            value={formatCurrency(product.cost_price)}
          />
          <InfoItem
            label="Preço de venda"
            value={formatCurrency(product.sale_price)}
          />
          <InfoItem label="Margem de lucro" value={formatPercent(margin)} />
          {product.tracks_stock !== false ? (
            <>
              <InfoItem
                label="Estoque atual"
                value={formatStockQuantity(product.current_stock, product.unit)}
                emphasize={lowStock}
              />
              <InfoItem
                label="Estoque mínimo"
                value={formatStockQuantity(product.min_stock, product.unit)}
              />
              <InfoItem
                label="Estoque máximo"
                value={
                  product.max_stock == null
                    ? null
                    : formatStockQuantity(product.max_stock, product.unit)
                }
              />
              <InfoItem label="Localização" value={product.stock_location} />
            </>
          ) : (
            <InfoItem
              label="Estoque"
              value="Este item não participa do controle de estoque"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descrição</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">
            {product.description || "Sem descrição."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">
            {product.notes || "Nenhuma observação cadastrada."}
          </p>
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link href={ROUTES.products}>Voltar para a lista</Link>
        </Button>
      </div>
    </div>
  );
}
