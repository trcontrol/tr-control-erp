"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductForm } from "@/components/products/product-form";
import { ProductSearchCombobox } from "@/components/stock/product-search-combobox";
import {
  ROUTES,
  STOCK_ADJUSTMENT_DIRECTION_OPTIONS,
  STOCK_ADJUSTMENT_DIRECTIONS,
  STOCK_MOVEMENT_TYPES,
  stockMovementDetailPath,
  type StockMovementType,
} from "@/lib/constants";
import { parseStockInput } from "@/lib/products/format";
import {
  createStockMovement,
  listStockableProducts,
} from "@/lib/stock/actions";
import {
  formatStockQuantity,
  stockMovementTypeLabel,
  todayISODate,
} from "@/lib/stock/format";
import { useTenant } from "@/providers/tenant-provider";
import type { Product } from "@/types/database";

type StockMovementFormProps = {
  movementType: StockMovementType;
  presetProductId?: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function formCopy(type: StockMovementType) {
  switch (type) {
    case STOCK_MOVEMENT_TYPES.entry:
      return {
        title: "Nova entrada",
        description: "Registre uma entrada e aumente o estoque do produto.",
        quantityLabel: "Quantidade de entrada *",
      };
    case STOCK_MOVEMENT_TYPES.exit:
      return {
        title: "Nova saída",
        description: "Registre uma saída e reduza o estoque do produto.",
        quantityLabel: "Quantidade de saída *",
      };
    case STOCK_MOVEMENT_TYPES.adjustment:
      return {
        title: "Ajuste manual",
        description: "Corrija o saldo com um acréscimo ou decréscimo.",
        quantityLabel: "Quantidade do ajuste *",
      };
    case STOCK_MOVEMENT_TYPES.inventory:
      return {
        title: "Inventário",
        description:
          "Informe a quantidade contada. O sistema ajusta o saldo automaticamente.",
        quantityLabel: "Quantidade contada *",
      };
    default:
      return {
        title: "Movimentação",
        description: "Registre uma movimentação de estoque.",
        quantityLabel: "Quantidade *",
      };
  }
}

export function StockMovementForm({
  movementType,
  presetProductId,
}: StockMovementFormProps) {
  const router = useRouter();
  const { company } = useTenant();
  const copy = formCopy(movementType);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState(presetProductId ?? "");
  const [quantity, setQuantity] = useState("");
  const [movementDate, setMovementDate] = useState(todayISODate());
  const [notes, setNotes] = useState("");
  const [adjustmentDirection, setAdjustmentDirection] = useState<
    "increase" | "decrease"
  >(STOCK_ADJUSTMENT_DIRECTIONS.increase);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"productId" | "quantity" | "movementDate", string>>
  >({});

  const loadProducts = useCallback(
    async (options?: { selectProductId?: string }) => {
      if (!company?.id) {
        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      setLoadingProducts(true);
      const result = await listStockableProducts(company.id);

      if (result.error) {
        setError(result.error.message);
        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      setProducts(result.data);

      const nextSelectedId =
        options?.selectProductId ??
        (presetProductId &&
        result.data.some((item) => item.id === presetProductId)
          ? presetProductId
          : undefined);

      if (nextSelectedId) {
        setProductId(nextSelectedId);
        setFieldErrors((current) => ({ ...current, productId: undefined }));
      }

      setLoadingProducts(false);
    },
    [company?.id, presetProductId]
  );

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === productId) ?? null,
    [products, productId]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!company?.id) {
      setError("Selecione uma empresa ativa.");
      return;
    }

    const nextErrors: Partial<
      Record<"productId" | "quantity" | "movementDate", string>
    > = {};
    const parsedQuantity = parseStockInput(quantity);

    if (!productId) nextErrors.productId = "Selecione um produto cadastrado";
    if (!movementDate) nextErrors.movementDate = "Campo obrigatório";
    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      nextErrors.quantity = "Informe uma quantidade maior que zero";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Preencha os campos obrigatórios corretamente.");
      return;
    }

    setLoading(true);

    const result = await createStockMovement({
      companyId: company.id,
      productId,
      movementType,
      quantity: parsedQuantity,
      movementDate,
      notes,
      adjustmentDirection:
        movementType === STOCK_MOVEMENT_TYPES.adjustment
          ? adjustmentDirection
          : undefined,
    });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push(stockMovementDetailPath(result.data.id));
    router.refresh();
  }

  async function handleProductCreated(product: Product) {
    setProductModalOpen(false);
    setError(null);
    await loadProducts({ selectProductId: product.id });
  }

  return (
    <>
      <form className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
        {error ? (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product_id">Produto *</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <ProductSearchCombobox
                      id="product_id"
                      products={products}
                      value={productId}
                      loading={loadingProducts}
                      disabled={loading}
                      onChange={(nextId) => {
                        setProductId(nextId);
                        setFieldErrors((current) => ({
                          ...current,
                          productId: undefined,
                        }));
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setProductModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Novo Produto
                  </Button>
                </div>
                <FieldError message={fieldErrors.productId} />
                {!loadingProducts && products.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum produto com “Controlar estoque = Sim” encontrado.
                    Use “Novo Produto” para cadastrar sem sair desta tela.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                  {stockMovementTypeLabel(movementType)}
                </div>
              </div>

              {movementType === STOCK_MOVEMENT_TYPES.adjustment ? (
                <div className="space-y-2">
                  <Label htmlFor="adjustment_direction">Operação *</Label>
                  <Select
                    id="adjustment_direction"
                    value={adjustmentDirection}
                    onChange={(e) =>
                      setAdjustmentDirection(
                        e.target.value === "decrease"
                          ? "decrease"
                          : "increase"
                      )
                    }
                  >
                    {STOCK_ADJUSTMENT_DIRECTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Estoque atual</Label>
                  <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                    {selectedProduct
                      ? formatStockQuantity(
                          selectedProduct.current_stock,
                          selectedProduct.unit
                        )
                      : "—"}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="quantity">{copy.quantityLabel}</Label>
                <Input
                  id="quantity"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setFieldErrors((current) => ({
                      ...current,
                      quantity: undefined,
                    }));
                  }}
                  placeholder="0"
                  required
                />
                <FieldError message={fieldErrors.quantity} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="movement_date">Data *</Label>
                <Input
                  id="movement_date"
                  type="date"
                  value={movementDate}
                  onChange={(e) => {
                    setMovementDate(e.target.value);
                    setFieldErrors((current) => ({
                      ...current,
                      movementDate: undefined,
                    }));
                  }}
                  required
                />
                <FieldError message={fieldErrors.movementDate} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Usuário responsável</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                  Será registrado automaticamente o usuário logado.
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(ROUTES.stock)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || loadingProducts}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? "Salvando..." : "Registrar movimentação"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Dialog
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        title="Novo produto"
        description="Cadastre um produto com controle de estoque sem sair desta tela"
        className="max-w-4xl"
      >
        <ProductForm
          mode="create"
          stayOnSuccess
          requireTracksStock
          onCancel={() => setProductModalOpen(false)}
          onSuccess={(product) => {
            void handleProductCreated(product);
          }}
        />
      </Dialog>
    </>
  );
}
