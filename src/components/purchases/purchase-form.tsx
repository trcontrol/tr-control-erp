"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
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
  PAYMENT_METHODS,
  ROUTES,
  purchaseDetailPath,
} from "@/lib/constants";
import { listProducts } from "@/lib/products/actions";
import {
  createPurchase,
  updatePurchaseDraft,
  type PurchaseWithRelations,
} from "@/lib/purchases/actions";
import { amountToCurrencyInput } from "@/lib/products/format";
import {
  calcLineTotal,
  calcPurchaseTotal,
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  parseStockInput,
  todayISODate,
  toNumberAmount,
} from "@/lib/purchases/format";
import { listSuppliers } from "@/lib/suppliers/actions";
import { PERMISSION_MODULES } from "@/lib/users/permissions";
import { useTenant } from "@/providers/tenant-provider";
import type { Product, Supplier } from "@/types/database";

type DraftItem = {
  key: string;
  product_id: string;
  quantity: string;
  unit_cost: string;
  discount_amount: string;
};

type PurchaseFormProps = {
  mode: "create" | "edit";
  purchase?: PurchaseWithRelations;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function createEmptyItem(): DraftItem {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    product_id: "",
    quantity: "1",
    unit_cost: "",
    discount_amount: "",
  };
}

export function PurchaseForm({ mode, purchase }: PurchaseFormProps) {
  const router = useRouter();
  const { company, creatableModules, editableModules } = useTenant();
  const canCreate = creatableModules.includes(PERMISSION_MODULES.purchases);
  const canEdit = editableModules.includes(PERMISSION_MODULES.purchases);
  const actionAllowed = mode === "create" ? canCreate : canEdit;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState(purchase?.supplier_id ?? "");
  const [purchaseDate, setPurchaseDate] = useState(
    purchase?.purchase_date ?? todayISODate()
  );
  const [dueDate, setDueDate] = useState(purchase?.due_date ?? "");
  const [paymentMethod, setPaymentMethod] = useState(
    purchase?.payment_method ?? ""
  );
  const [documentNumber, setDocumentNumber] = useState(
    purchase?.document_number ?? ""
  );
  const [notes, setNotes] = useState(purchase?.notes ?? "");
  const [freightAmount, setFreightAmount] = useState(
    amountToCurrencyInput(purchase?.freight_amount ?? 0)
  );
  const [discountAmount, setDiscountAmount] = useState(
    amountToCurrencyInput(purchase?.discount_amount ?? 0)
  );
  const [items, setItems] = useState<DraftItem[]>(() => {
    if (purchase?.items?.length) {
      return purchase.items.map((item) => ({
        key: item.id,
        product_id: item.product_id,
        quantity: String(toNumberAmount(item.quantity)).replace(".", ","),
        unit_cost: amountToCurrencyInput(item.unit_cost),
        discount_amount: amountToCurrencyInput(item.discount_amount),
      }));
    }
    return [createEmptyItem()];
  });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function reloadProducts(selectProductId?: string) {
    if (!company?.id) return;
    const result = await listProducts({
      companyId: company.id,
      status: "active",
    });
    if (result.data) {
      setProducts(result.data);
      if (selectProductId) {
        setItems((current) => {
          const emptyIndex = current.findIndex((item) => !item.product_id);
          if (emptyIndex >= 0) {
            const next = [...current];
            next[emptyIndex] = {
              ...next[emptyIndex],
              product_id: selectProductId,
            };
            return next;
          }
          return [
            ...current,
            { ...createEmptyItem(), product_id: selectProductId },
          ];
        });
      }
    }
  }

  useEffect(() => {
    async function loadOptions() {
      if (!company?.id) {
        setLoadingOptions(false);
        return;
      }

      setLoadingOptions(true);
      const [suppliersResult, productsResult] = await Promise.all([
        listSuppliers({ companyId: company.id, status: "active" }),
        listProducts({ companyId: company.id, status: "active" }),
      ]);

      if (suppliersResult.data) setSuppliers(suppliersResult.data);
      if (productsResult.data) setProducts(productsResult.data);

      if (suppliersResult.error || productsResult.error) {
        setError(
          suppliersResult.error?.message ||
            productsResult.error?.message ||
            "Erro ao carregar opções."
        );
      }

      setLoadingOptions(false);
    }

    void loadOptions();
  }, [company?.id]);

  const preview = useMemo(() => {
    const parsedItems = items.map((item) => {
      const quantity = parseStockInput(item.quantity || "0");
      const unitCost = parseCurrencyInput(item.unit_cost || "0");
      const discount = parseCurrencyInput(item.discount_amount || "0");
      return {
        quantity,
        unitCost,
        discount,
        lineTotal: calcLineTotal(quantity, unitCost, discount),
      };
    });
    const itemsSubtotal = parsedItems.reduce(
      (sum, item) => sum + (Number.isFinite(item.lineTotal) ? item.lineTotal : 0),
      0
    );
    const freight = parseCurrencyInput(freightAmount || "0");
    const discount = parseCurrencyInput(discountAmount || "0");
    return {
      itemsSubtotal,
      freight,
      discount,
      total: calcPurchaseTotal(itemsSubtotal, discount, freight),
    };
  }, [items, freightAmount, discountAmount]);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  }

  function removeItem(key: string) {
    setItems((current) =>
      current.length === 1
        ? [createEmptyItem()]
        : current.filter((item) => item.key !== key)
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!company?.id) {
      setError("Selecione uma empresa ativa.");
      return;
    }

    if (!actionAllowed) {
      setError(
        mode === "create"
          ? "Você não tem permissão para criar compras."
          : "Você não tem permissão para editar compras."
      );
      return;
    }

    const nextErrors: Record<string, string> = {};
    if (!purchaseDate) nextErrors.purchaseDate = "Campo obrigatório";

    const parsedItems = items
      .filter((item) => item.product_id)
      .map((item, index) => ({
        product_id: item.product_id,
        quantity: parseStockInput(item.quantity || "0"),
        unit_cost: parseCurrencyInput(item.unit_cost || "0"),
        discount_amount: parseCurrencyInput(item.discount_amount || "0"),
        sort_order: index,
      }));

    if (parsedItems.length === 0) {
      nextErrors.items = "Adicione pelo menos um produto à compra.";
    }

    for (const item of parsedItems) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        nextErrors.items = "A quantidade de cada item deve ser maior que zero.";
        break;
      }
      if (!Number.isFinite(item.unit_cost) || item.unit_cost < 0) {
        nextErrors.items = "O valor unitário não pode ser negativo.";
        break;
      }
    }

    const freight = parseCurrencyInput(freightAmount || "0");
    const discount = parseCurrencyInput(discountAmount || "0");
    if (!Number.isFinite(freight) || freight < 0) {
      nextErrors.freightAmount = "Frete inválido";
    }
    if (!Number.isFinite(discount) || discount < 0) {
      nextErrors.discountAmount = "Desconto inválido";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Preencha os campos obrigatórios corretamente.");
      return;
    }

    setLoading(true);

    const header = {
      supplier_id: supplierId || null,
      purchase_date: purchaseDate,
      due_date: dueDate || null,
      payment_method: paymentMethod || null,
      document_number: documentNumber.trim() || null,
      notes: notes.trim() || null,
      freight_amount: freight,
      discount_amount: discount,
    };

    const result =
      mode === "create"
        ? await createPurchase({
            companyId: company.id,
            header,
            items: parsedItems,
          })
        : await updatePurchaseDraft({
            companyId: company.id,
            purchaseId: purchase!.id,
            header,
            items: parsedItems,
          });

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível salvar a compra.");
      setLoading(false);
      return;
    }

    router.push(purchaseDetailPath(result.data.id));
    router.refresh();
  }

  return (
    <>
      <form className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
        {!actionAllowed ? (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {mode === "create"
              ? "Você não tem permissão para criar compras."
              : "Você não tem permissão para editar compras."}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Dados da compra</CardTitle>
            <CardDescription>
              O fornecedor é obrigatório apenas na confirmação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="supplier_id">Fornecedor</Label>
                <Select
                  id="supplier_id"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  disabled={loadingOptions}
                >
                  <option value="">Selecione (opcional no rascunho)</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.trade_name || supplier.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Data da compra *</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                />
                <FieldError message={fieldErrors.purchaseDate} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Data de vencimento</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Forma de pagamento</Label>
                <Select
                  id="payment_method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="document_number">Documento / Nota fiscal</Label>
                <Input
                  id="document_number"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Número da NF ou documento"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Itens da compra</CardTitle>
              <CardDescription>
                Quantidade, valor unitário, desconto e total por item
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProductModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setItems((current) => [...current, createEmptyItem()])}
              >
                <Plus className="h-4 w-4" />
                Adicionar item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldError message={fieldErrors.items} />
            {items.map((item, index) => {
              const quantity = parseStockInput(item.quantity || "0");
              const unitCost = parseCurrencyInput(item.unit_cost || "0");
              const discount = parseCurrencyInput(item.discount_amount || "0");
              const lineTotal = calcLineTotal(quantity, unitCost, discount);

              return (
                <div
                  key={item.key}
                  className="space-y-3 rounded-xl border p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Item {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.key)}
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Produto *</Label>
                    <ProductSearchCombobox
                      products={products}
                      value={item.product_id}
                      loading={loadingOptions}
                      onChange={(productId) => {
                        const product = products.find((p) => p.id === productId);
                        updateItem(item.key, {
                          product_id: productId,
                          unit_cost:
                            product && !item.unit_cost
                              ? amountToCurrencyInput(product.cost_price)
                              : item.unit_cost,
                        });
                      }}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Quantidade *</Label>
                      <Input
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.key, { quantity: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor unitário *</Label>
                      <Input
                        value={item.unit_cost}
                        onChange={(e) =>
                          updateItem(item.key, {
                            unit_cost: formatCurrencyInput(e.target.value),
                          })
                        }
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Desconto</Label>
                      <Input
                        value={item.discount_amount}
                        onChange={(e) =>
                          updateItem(item.key, {
                            discount_amount: formatCurrencyInput(e.target.value),
                          })
                        }
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total do item</Label>
                      <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                        {formatCurrency(lineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totais e observações</CardTitle>
            <CardDescription>
              Os totais finais serão recalculados no banco ao salvar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Subtotal dos itens</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                  {formatCurrency(preview.itemsSubtotal)}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_amount">Desconto geral</Label>
                <Input
                  id="discount_amount"
                  value={discountAmount}
                  onChange={(e) =>
                    setDiscountAmount(formatCurrencyInput(e.target.value))
                  }
                  placeholder="0,00"
                />
                <FieldError message={fieldErrors.discountAmount} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freight_amount">Frete</Label>
                <Input
                  id="freight_amount"
                  value={freightAmount}
                  onChange={(e) =>
                    setFreightAmount(formatCurrencyInput(e.target.value))
                  }
                  placeholder="0,00"
                />
                <FieldError message={fieldErrors.freightAmount} />
              </div>
              <div className="space-y-2">
                <Label>Valor total</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold">
                  {formatCurrency(preview.total)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(
                  purchase ? purchaseDetailPath(purchase.id) : ROUTES.purchases
                )
              }
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingOptions || !actionAllowed}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading
                ? "Salvando..."
                : mode === "create"
                  ? "Salvar rascunho"
                  : "Salvar alterações"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Dialog
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        title="Novo produto"
        description="Cadastre um produto sem sair da compra"
        className="max-w-4xl"
      >
        <ProductForm
          mode="create"
          stayOnSuccess
          onCancel={() => setProductModalOpen(false)}
          onSuccess={(product) => {
            setProductModalOpen(false);
            void reloadProducts(product.id);
          }}
        />
      </Dialog>
    </>
  );
}
