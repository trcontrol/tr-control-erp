"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  SaleInstallmentSection,
  type DraftInstallmentRow,
} from "@/components/sales/sale-installment-section";
import { PAYMENT_METHODS, ROUTES, saleDetailPath } from "@/lib/constants";
import { listCustomers } from "@/lib/customers/actions";
import { listProducts } from "@/lib/products/actions";
import { amountToCurrencyInput } from "@/lib/products/format";
import {
  createSale,
  updateSaleDraft,
  type SaleWithRelations,
} from "@/lib/sales/actions";
import {
  calcLineTotal,
  calcSaleTotal,
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  parseStockInput,
  todayISODate,
  toNumberAmount,
} from "@/lib/sales/format";
import {
  PAYMENT_CONDITIONS,
  PAYMENT_CONDITION_OPTIONS,
  generateInstallmentSchedule,
  scheduleDifference,
  validateInstallmentSchedule,
  type PaymentCondition,
} from "@/lib/sales/installments";
import { PERMISSION_MODULES } from "@/lib/users/permissions";
import { useTenant } from "@/providers/tenant-provider";
import type { Customer, Product } from "@/types/database";

type DraftItem = {
  key: string;
  product_id: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
};

type PlanMode = "none" | "auto" | "manual";

type SaleFormProps = {
  mode: "create" | "edit";
  sale?: SaleWithRelations;
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
    unit_price: "",
    discount_amount: "",
  };
}

function scheduleRowKey(prefix: string, number: number) {
  return `${prefix}-${number}`;
}

function toDraftInstallments(
  sale: SaleWithRelations | undefined
): DraftInstallmentRow[] {
  const schedules = sale?.payment_schedules ?? [];
  if (!schedules.length) return [];
  return schedules.map((row) => ({
    key: scheduleRowKey(row.id, row.installment_number),
    installment_number: row.installment_number,
    due_date: row.due_date,
    amount: amountToCurrencyInput(row.amount),
    payment_method: row.payment_method ?? "",
  }));
}

function detectPlanMode(
  sale: SaleWithRelations | undefined,
  drafts: DraftInstallmentRow[],
  paymentMethod: string
): PlanMode {
  if (!drafts.length) return "none";
  const count = drafts.length;
  const firstDue = drafts[0]?.due_date;
  if (!firstDue) return "manual";

  const generated = generateInstallmentSchedule({
    totalAmount: toNumberAmount(sale?.total_amount ?? 0),
    installmentCount: count,
    firstDueDate: firstDue,
    paymentMethod: paymentMethod || null,
  });

  if (generated.length !== drafts.length) return "manual";

  const matches = generated.every((row, index) => {
    const draft = drafts[index];
    return (
      draft.installment_number === row.installment_number &&
      draft.due_date === row.due_date &&
      parseCurrencyInput(draft.amount || "0") === row.amount &&
      (draft.payment_method || null) === (row.payment_method || null)
    );
  });

  return matches ? "auto" : "manual";
}

export function SaleForm({ mode, sale }: SaleFormProps) {
  const router = useRouter();
  const { company, creatableModules, editableModules } = useTenant();
  const canCreate = creatableModules.includes(PERMISSION_MODULES.sales);
  const canEdit = editableModules.includes(PERMISSION_MODULES.sales);
  const actionAllowed = mode === "create" ? canCreate : canEdit;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState(sale?.customer_id ?? "");
  const [saleDate, setSaleDate] = useState(sale?.sale_date ?? todayISODate());
  const [dueDate, setDueDate] = useState(sale?.due_date ?? "");
  const [paymentMethod, setPaymentMethod] = useState(sale?.payment_method ?? "");
  const [paymentCondition, setPaymentCondition] = useState<PaymentCondition>(
    sale?.payment_condition === PAYMENT_CONDITIONS.installment
      ? PAYMENT_CONDITIONS.installment
      : PAYMENT_CONDITIONS.cash
  );
  const [documentNumber, setDocumentNumber] = useState(
    sale?.document_number ?? ""
  );
  const [notes, setNotes] = useState(sale?.notes ?? "");
  const [freightAmount, setFreightAmount] = useState(
    amountToCurrencyInput(sale?.freight_amount ?? 0)
  );
  const [discountAmount, setDiscountAmount] = useState(
    amountToCurrencyInput(sale?.discount_amount ?? 0)
  );
  const [items, setItems] = useState<DraftItem[]>(() => {
    if (sale?.items?.length) {
      return sale.items.map((item) => ({
        key: item.id,
        product_id: item.product_id,
        quantity: String(toNumberAmount(item.quantity)).replace(".", ","),
        unit_price: amountToCurrencyInput(item.unit_price),
        discount_amount: amountToCurrencyInput(item.discount_amount),
      }));
    }
    return [createEmptyItem()];
  });

  const initialDrafts = toDraftInstallments(sale);
  const [installmentCount, setInstallmentCount] = useState(() => {
    const fromSchedule = sale?.payment_schedules?.[0]?.installment_count;
    if (fromSchedule) return String(fromSchedule);
    if (initialDrafts.length >= 2) return String(initialDrafts.length);
    return "3";
  });
  const [firstDueDate, setFirstDueDate] = useState(
    initialDrafts[0]?.due_date ?? ""
  );
  const [installmentRows, setInstallmentRows] =
    useState<DraftInstallmentRow[]>(initialDrafts);
  const [planMode, setPlanMode] = useState<PlanMode>(() =>
    detectPlanMode(sale, initialDrafts, sale?.payment_method ?? "")
  );
  const [divergenceWarning, setDivergenceWarning] = useState(false);
  const lastAutoTotalRef = useRef<number | null>(
    planMode === "auto" ? toNumberAmount(sale?.total_amount ?? 0) : null
  );

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
        const product = result.data.find((item) => item.id === selectProductId);
        setItems((current) => {
          const emptyIndex = current.findIndex((item) => !item.product_id);
          const nextItem = {
            ...createEmptyItem(),
            product_id: selectProductId,
            unit_price: product
              ? amountToCurrencyInput(product.sale_price)
              : "",
          };
          if (emptyIndex >= 0) {
            const next = [...current];
            next[emptyIndex] = {
              ...next[emptyIndex],
              ...nextItem,
              key: next[emptyIndex].key,
            };
            return next;
          }
          return [...current, nextItem];
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
      const [customersResult, productsResult] = await Promise.all([
        listCustomers({ companyId: company.id, status: "active" }),
        listProducts({ companyId: company.id, status: "active" }),
      ]);

      if (customersResult.data) setCustomers(customersResult.data);
      if (productsResult.data) setProducts(productsResult.data);

      if (customersResult.error || productsResult.error) {
        setError(
          customersResult.error?.message ||
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
      const unitPrice = parseCurrencyInput(item.unit_price || "0");
      const discount = parseCurrencyInput(item.discount_amount || "0");
      return {
        lineTotal: calcLineTotal(quantity, unitPrice, discount),
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
      total: calcSaleTotal(itemsSubtotal, discount, freight),
    };
  }, [items, freightAmount, discountAmount]);

  function buildGeneratedRows(total: number, count: number, firstDue: string) {
    return generateInstallmentSchedule({
      totalAmount: total,
      installmentCount: count,
      firstDueDate: firstDue,
      paymentMethod: paymentMethod || null,
    }).map((row) => ({
      key: scheduleRowKey("gen", row.installment_number),
      installment_number: row.installment_number,
      due_date: row.due_date,
      amount: amountToCurrencyInput(row.amount),
      payment_method: row.payment_method ?? "",
    }));
  }

  function applyGeneratedPlan(total: number) {
    const count = Number.parseInt(installmentCount, 10);
    if (!Number.isFinite(count) || count < 2) {
      setFieldErrors((current) => ({
        ...current,
        installments: "Informe no mínimo 2 parcelas.",
      }));
      return false;
    }
    if (!firstDueDate) {
      setFieldErrors((current) => ({
        ...current,
        installments: "Informe a primeira data de vencimento.",
      }));
      return false;
    }
    if (total <= 0) {
      setFieldErrors((current) => ({
        ...current,
        installments: "O total da venda deve ser maior que zero para parcelar.",
      }));
      return false;
    }

    const nextRows = buildGeneratedRows(total, count, firstDueDate);
    setInstallmentRows(nextRows);
    setPlanMode("auto");
    setDivergenceWarning(false);
    lastAutoTotalRef.current = total;
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.installments;
      return next;
    });
    return true;
  }

  useEffect(() => {
    if (paymentCondition !== PAYMENT_CONDITIONS.installment) return;
    if (planMode !== "auto" || installmentRows.length === 0) return;

    const total = preview.total;
    if (
      lastAutoTotalRef.current != null &&
      Math.round(lastAutoTotalRef.current * 100) === Math.round(total * 100)
    ) {
      return;
    }

    const count = Number.parseInt(installmentCount, 10);
    if (!Number.isFinite(count) || count < 2 || !firstDueDate || total <= 0) {
      return;
    }

    setInstallmentRows(buildGeneratedRows(total, count, firstDueDate));
    lastAutoTotalRef.current = total;
    setDivergenceWarning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regen only on total/count/firstDue/method when auto
  }, [
    preview.total,
    planMode,
    paymentCondition,
    installmentCount,
    firstDueDate,
    paymentMethod,
  ]);

  useEffect(() => {
    if (paymentCondition !== PAYMENT_CONDITIONS.installment) {
      setDivergenceWarning(false);
      return;
    }
    if (planMode !== "manual" || installmentRows.length === 0) {
      setDivergenceWarning(false);
      return;
    }
    const diff = scheduleDifference(
      preview.total,
      installmentRows.map((row) => ({
        amount: parseCurrencyInput(row.amount || "0"),
      }))
    );
    setDivergenceWarning(Math.round(diff * 100) !== 0);
  }, [preview.total, planMode, paymentCondition, installmentRows]);

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

  function handlePaymentConditionChange(value: string) {
    const next =
      value === PAYMENT_CONDITIONS.installment
        ? PAYMENT_CONDITIONS.installment
        : PAYMENT_CONDITIONS.cash;

    setPaymentCondition(next);
    if (next === PAYMENT_CONDITIONS.cash) {
      setInstallmentRows([]);
      setPlanMode("none");
      setDivergenceWarning(false);
      lastAutoTotalRef.current = null;
      setFieldErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors.installments;
        return nextErrors;
      });
    }
  }

  function handleInstallmentRowChange(
    key: string,
    patch: Partial<DraftInstallmentRow>
  ) {
    setInstallmentRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
    setPlanMode("manual");
  }

  function handleGenerateInstallments() {
    applyGeneratedPlan(preview.total);
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
          ? "Você não tem permissão para criar vendas."
          : "Você não tem permissão para editar vendas."
      );
      return;
    }

    const nextErrors: Record<string, string> = {};
    if (!saleDate) nextErrors.saleDate = "Campo obrigatório";

    const parsedItems = items
      .filter((item) => item.product_id)
      .map((item, index) => ({
        product_id: item.product_id,
        quantity: parseStockInput(item.quantity || "0"),
        unit_price: parseCurrencyInput(item.unit_price || "0"),
        discount_amount: parseCurrencyInput(item.discount_amount || "0"),
        sort_order: index,
      }));

    if (parsedItems.length === 0) {
      nextErrors.items = "Adicione pelo menos um produto ou serviço à venda.";
    }

    for (const item of parsedItems) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        nextErrors.items = "A quantidade de cada item deve ser maior que zero.";
        break;
      }
      if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
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

    const saleTotal = calcSaleTotal(
      parsedItems.reduce(
        (sum, item) =>
          sum +
          calcLineTotal(item.quantity, item.unit_price, item.discount_amount),
        0
      ),
      discount,
      freight
    );

    let schedulesPayload:
      | {
          installment_number: number;
          installment_count: number;
          due_date: string;
          amount: number;
          payment_method: string | null;
        }[]
      | undefined;

    if (paymentCondition === PAYMENT_CONDITIONS.installment) {
      const count = installmentRows.length;
      const parsedRows = installmentRows.map((row) => ({
        installment_number: row.installment_number,
        installment_count: count,
        due_date: row.due_date,
        amount: parseCurrencyInput(row.amount || "0"),
        payment_method: row.payment_method || null,
      }));

      const scheduleError = validateInstallmentSchedule({
        saleTotal,
        rows: parsedRows,
      });
      if (scheduleError) {
        nextErrors.installments = scheduleError;
      } else {
        schedulesPayload = parsedRows;
      }
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Preencha os campos obrigatórios corretamente.");
      return;
    }

    setLoading(true);

    const resolvedDueDate =
      paymentCondition === PAYMENT_CONDITIONS.installment
        ? installmentRows[0]?.due_date || dueDate || null
        : dueDate || null;

    const header = {
      customer_id: customerId || null,
      sale_date: saleDate,
      due_date: resolvedDueDate,
      payment_method: paymentMethod || null,
      payment_condition: paymentCondition,
      document_number: documentNumber.trim() || null,
      notes: notes.trim() || null,
      freight_amount: freight,
      discount_amount: discount,
    };

    const result =
      mode === "create"
        ? await createSale({
            companyId: company.id,
            header,
            items: parsedItems,
            schedules: schedulesPayload,
          })
        : await updateSaleDraft({
            companyId: company.id,
            saleId: sale!.id,
            header,
            items: parsedItems,
            schedules: schedulesPayload,
          });

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Não foi possível salvar a venda.");
      setLoading(false);
      return;
    }

    router.push(saleDetailPath(result.data.id));
    router.refresh();
  }

  const isInstallment = paymentCondition === PAYMENT_CONDITIONS.installment;

  return (
    <>
      <form className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
        {!actionAllowed ? (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {mode === "create"
              ? "Você não tem permissão para criar vendas."
              : "Você não tem permissão para editar vendas."}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Dados da venda</CardTitle>
            <CardDescription>
              O cliente é obrigatório apenas na confirmação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="customer_id">Cliente</Label>
                <Select
                  id="customer_id"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={loadingOptions}
                >
                  <option value="">Selecione (opcional no rascunho)</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.trade_name || customer.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_date">Data da venda *</Label>
                <Input
                  id="sale_date"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                />
                <FieldError message={fieldErrors.saleDate} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_condition">Condição de pagamento</Label>
                <Select
                  id="payment_condition"
                  value={paymentCondition}
                  onChange={(e) => handlePaymentConditionChange(e.target.value)}
                >
                  {PAYMENT_CONDITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              {!isInstallment ? (
                <>
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
                </>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="document_number">Pedido / Documento</Label>
                <Input
                  id="document_number"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Número do pedido ou documento"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isInstallment ? (
          <Card>
            <CardHeader>
              <CardTitle>Parcelamento</CardTitle>
              <CardDescription>
                Divida o total da venda em parcelas. A forma padrão preenche as
                linhas; cada parcela pode ser ajustada depois.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SaleInstallmentSection
                installmentCount={installmentCount}
                firstDueDate={firstDueDate}
                paymentMethod={paymentMethod}
                rows={installmentRows}
                saleTotal={preview.total}
                planMode={planMode}
                divergenceWarning={divergenceWarning}
                disabled={loading || !actionAllowed}
                onInstallmentCountChange={setInstallmentCount}
                onFirstDueDateChange={setFirstDueDate}
                onPaymentMethodChange={setPaymentMethod}
                onGenerate={handleGenerateInstallments}
                onRowChange={handleInstallmentRowChange}
                error={fieldErrors.installments}
              />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Itens da venda</CardTitle>
              <CardDescription>
                Produtos e serviços com quantidade, preço, desconto e total
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
                onClick={() =>
                  setItems((current) => [...current, createEmptyItem()])
                }
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
              const unitPrice = parseCurrencyInput(item.unit_price || "0");
              const discount = parseCurrencyInput(item.discount_amount || "0");
              const lineTotal = calcLineTotal(quantity, unitPrice, discount);

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
                    <Label>Produto / Serviço *</Label>
                    <ProductSearchCombobox
                      products={products}
                      value={item.product_id}
                      loading={loadingOptions}
                      onChange={(productId) => {
                        const product = products.find((p) => p.id === productId);
                        updateItem(item.key, {
                          product_id: productId,
                          unit_price: product
                            ? amountToCurrencyInput(product.sale_price)
                            : item.unit_price,
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
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(item.key, {
                            unit_price: formatCurrencyInput(e.target.value),
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
                            discount_amount: formatCurrencyInput(
                              e.target.value
                            ),
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
                router.push(sale ? saleDetailPath(sale.id) : ROUTES.sales)
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
        description="Cadastre um produto ou serviço sem sair da venda"
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
