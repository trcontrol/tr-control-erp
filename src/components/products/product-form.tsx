"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Package, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUS,
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  PRODUCT_TYPES,
  PRODUCT_UNITS,
  ROUTES,
  productDetailPath,
  type ProductItemType,
} from "@/lib/constants";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
} from "@/lib/products/actions";
import {
  amountToCurrencyInput,
  calculateProfitMargin,
  formatCurrencyInput,
  formatPercent,
  formatStockInput,
  parseCurrencyInput,
  parseStockInput,
} from "@/lib/products/format";
import { useTenant } from "@/providers/tenant-provider";
import type { Product, ProductInsert } from "@/types/database";

type ProductFormState = {
  product_type: ProductItemType;
  internal_code: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  unit: string;
  ncm: string;
  cost_price: string;
  sale_price: string;
  current_stock: string;
  min_stock: string;
  max_stock: string;
  stock_location: string;
  image_url: string;
  status: string;
  notes: string;
};

type ProductFormProps = {
  mode: "create" | "edit";
  product?: Product;
};

function toFormState(product?: Product): ProductFormState {
  return {
    product_type:
      product?.product_type === PRODUCT_TYPES.service
        ? PRODUCT_TYPES.service
        : PRODUCT_TYPES.product,
    internal_code: product?.internal_code ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    category: product?.category ?? "",
    brand: product?.brand ?? "",
    unit: product?.unit ?? "",
    ncm: product?.ncm ?? "",
    cost_price: amountToCurrencyInput(product?.cost_price ?? 0),
    sale_price: amountToCurrencyInput(product?.sale_price ?? 0),
    current_stock: formatStockInput(product?.current_stock ?? 0),
    min_stock: formatStockInput(product?.min_stock ?? 0),
    max_stock:
      product?.max_stock == null ? "" : formatStockInput(product.max_stock),
    stock_location: product?.stock_location ?? "",
    image_url: product?.image_url ?? "",
    status: product?.status ?? PRODUCT_STATUS.active,
    notes: product?.notes ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const { company } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProductFormState>(() => toFormState(product));
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ProductFormState, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const margin = useMemo(() => {
    const cost = parseCurrencyInput(form.cost_price || "0");
    const sale = parseCurrencyInput(form.sale_price || "0");
    if (Number.isNaN(cost) || Number.isNaN(sale)) return null;
    return calculateProfitMargin(cost, sale);
  }, [form.cost_price, form.sale_price]);

  function updateField<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSuccess(null);
  }

  function validate() {
    const nextErrors: Partial<Record<keyof ProductFormState, string>> = {};
    const cost = parseCurrencyInput(form.cost_price || "0");
    const sale = parseCurrencyInput(form.sale_price || "0");
    const currentStock = parseStockInput(form.current_stock || "0");
    const minStock = parseStockInput(form.min_stock || "0");
    const maxStock = form.max_stock
      ? parseStockInput(form.max_stock)
      : null;

    if (!form.name.trim()) nextErrors.name = "Campo obrigatório";
    if (!form.product_type) nextErrors.product_type = "Campo obrigatório";
    if (Number.isNaN(cost) || cost < 0) nextErrors.cost_price = "Valor inválido";
    if (Number.isNaN(sale) || sale < 0) nextErrors.sale_price = "Valor inválido";
    if (Number.isNaN(currentStock)) nextErrors.current_stock = "Estoque inválido";
    if (Number.isNaN(minStock) || minStock < 0) {
      nextErrors.min_stock = "Estoque mínimo inválido";
    }
    if (maxStock != null && (Number.isNaN(maxStock) || maxStock < 0)) {
      nextErrors.max_stock = "Estoque máximo inválido";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleImageChange(file: File | null) {
    if (!file || !company?.id) return;

    if (!file.type.startsWith("image/")) {
      setError("Envie um arquivo de imagem válido (JPG, PNG, WEBP ou GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setUploadingImage(true);
    setError(null);
    setSuccess(null);

    try {
      const { publicUrl, error: uploadError } = await uploadProductImage(
        company.id,
        file
      );

      if (uploadError || !publicUrl) {
        setError(uploadError ?? "Não foi possível enviar a imagem.");
        return;
      }

      updateField("image_url", publicUrl);
      setSuccess("Imagem enviada. Clique em salvar para confirmar.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar a imagem."
      );
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!company?.id) {
      setError("Selecione uma empresa ativa.");
      return;
    }

    if (!validate()) {
      setError("Preencha os campos obrigatórios corretamente.");
      return;
    }

    setLoading(true);

    const payload: ProductInsert = {
      company_id: company.id,
      product_type: form.product_type,
      internal_code: form.internal_code.trim() || null,
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      brand: form.brand.trim() || null,
      unit: form.unit.trim() || null,
      ncm: form.ncm.trim() || null,
      cost_price: parseCurrencyInput(form.cost_price || "0"),
      sale_price: parseCurrencyInput(form.sale_price || "0"),
      current_stock: parseStockInput(form.current_stock || "0"),
      min_stock: parseStockInput(form.min_stock || "0"),
      max_stock: form.max_stock
        ? parseStockInput(form.max_stock)
        : null,
      stock_location: form.stock_location.trim() || null,
      image_url: form.image_url || null,
      status: form.status || PRODUCT_STATUS.active,
      notes: form.notes.trim() || null,
    };

    try {
      const result =
        mode === "create"
          ? await createProduct(payload)
          : await updateProduct(company.id, product!.id, payload);

      if (result.error || !result.data) {
        setError(result.error?.message ?? "Não foi possível salvar o produto.");
        return;
      }

      setSuccess(
        mode === "create"
          ? "Produto cadastrado com sucesso."
          : "Produto atualizado com sucesso."
      );
      router.push(productDetailPath(result.data.id));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro inesperado ao salvar o produto."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-primary/10 p-3 text-sm text-foreground">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
          <CardDescription>Dados principais do produto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 rounded-xl">
              {form.image_url ? (
                <AvatarImage
                  src={form.image_url}
                  alt={form.name || "Foto do produto"}
                  className="rounded-xl object-cover"
                />
              ) : null}
              <AvatarFallback className="rounded-xl">
                <Package className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="image">Foto principal</Label>
              <input
                ref={fileInputRef}
                id="image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={uploadingImage}
                onChange={(event) =>
                  void handleImageChange(event.target.files?.[0] ?? null)
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {uploadingImage ? "Enviando..." : "Enviar foto"}
                </Button>
                {form.image_url ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => updateField("image_url", "")}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Opcional · PNG, JPG, WEBP ou GIF até 5 MB
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product_type">Tipo *</Label>
              <Select
                id="product_type"
                value={form.product_type}
                onChange={(e) =>
                  updateField(
                    "product_type",
                    e.target.value as ProductItemType
                  )
                }
                required
              >
                {PRODUCT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.product_type} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                id="status"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                {PRODUCT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internal_code">Código interno</Label>
              <Input
                id="internal_code"
                value={form.internal_code}
                onChange={(e) => updateField("internal_code", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => updateField("sku", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Código de barras</Label>
              <Input
                id="barcode"
                value={form.barcode}
                onChange={(e) => updateField("barcode", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Select
                id="unit"
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value)}
              >
                <option value="">Selecione</option>
                {PRODUCT_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                id="category"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                <option value="">Selecione</option>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={form.brand}
                onChange={(e) => updateField("brand", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ncm">NCM</Label>
              <Input
                id="ncm"
                value={form.ncm}
                onChange={(e) => updateField("ncm", e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preços</CardTitle>
          <CardDescription>
            Margem calculada automaticamente sobre o preço de venda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cost_price">Preço de custo</Label>
              <Input
                id="cost_price"
                value={form.cost_price}
                onChange={(e) =>
                  updateField("cost_price", formatCurrencyInput(e.target.value))
                }
                placeholder="0,00"
              />
              <FieldError message={fieldErrors.cost_price} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_price">Preço de venda</Label>
              <Input
                id="sale_price"
                value={form.sale_price}
                onChange={(e) =>
                  updateField("sale_price", formatCurrencyInput(e.target.value))
                }
                placeholder="0,00"
              />
              <FieldError message={fieldErrors.sale_price} />
            </div>
            <div className="space-y-2">
              <Label>Margem de lucro</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                {formatPercent(margin)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estoque</CardTitle>
          <CardDescription>
            Controle básico preparado para integrações futuras
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="current_stock">Estoque atual</Label>
              <Input
                id="current_stock"
                value={form.current_stock}
                onChange={(e) => updateField("current_stock", e.target.value)}
              />
              <FieldError message={fieldErrors.current_stock} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock">Estoque mínimo</Label>
              <Input
                id="min_stock"
                value={form.min_stock}
                onChange={(e) => updateField("min_stock", e.target.value)}
              />
              <FieldError message={fieldErrors.min_stock} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_stock">Estoque máximo</Label>
              <Input
                id="max_stock"
                value={form.max_stock}
                onChange={(e) => updateField("max_stock", e.target.value)}
              />
              <FieldError message={fieldErrors.max_stock} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_location">Localização no estoque</Label>
              <Input
                id="stock_location"
                value={form.stock_location}
                onChange={(e) => updateField("stock_location", e.target.value)}
                placeholder="Ex.: Prateleira A1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={4}
          />
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push(
                product ? productDetailPath(product.id) : ROUTES.products
              )
            }
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || uploadingImage}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading
              ? "Salvando..."
              : mode === "create"
                ? "Cadastrar produto"
                : "Salvar alterações"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
