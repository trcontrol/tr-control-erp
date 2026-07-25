"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
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
import {
  BRAZILIAN_STATES,
  PERSON_TYPES,
  PERSON_TYPE_OPTIONS,
  ROUTES,
  SUPPLIER_CATEGORIES,
  SUPPLIER_STATUS,
  SUPPLIER_STATUS_OPTIONS,
  supplierDetailPath,
  type PersonType,
} from "@/lib/constants";
import { createSupplier, updateSupplier } from "@/lib/suppliers/actions";
import {
  formatDocument,
  formatPhone,
  formatZipCode,
  isValidDocument,
  isValidEmail,
  onlyDigits,
} from "@/lib/customers/format";
import { useTenant } from "@/providers/tenant-provider";
import type { Supplier, SupplierInsert } from "@/types/database";

type SupplierFormState = {
  person_type: PersonType;
  full_name: string;
  trade_name: string;
  document: string;
  secondary_document: string;
  email: string;
  phone: string;
  whatsapp: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  contact_name: string;
  category: string;
  notes: string;
  status: string;
};

type SupplierFormProps = {
  mode: "create" | "edit";
  supplier?: Supplier;
};

function toFormState(supplier?: Supplier): SupplierFormState {
  const personType =
    supplier?.person_type === PERSON_TYPES.company
      ? PERSON_TYPES.company
      : PERSON_TYPES.individual;

  return {
    person_type: personType,
    full_name: supplier?.full_name ?? "",
    trade_name: supplier?.trade_name ?? "",
    document: supplier?.document
      ? formatDocument(supplier.document, personType)
      : "",
    secondary_document: supplier?.secondary_document ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ? formatPhone(supplier.phone) : "",
    whatsapp: supplier?.whatsapp ? formatPhone(supplier.whatsapp) : "",
    zip_code: supplier?.zip_code ? formatZipCode(supplier.zip_code) : "",
    street: supplier?.street ?? "",
    number: supplier?.number ?? "",
    complement: supplier?.complement ?? "",
    neighborhood: supplier?.neighborhood ?? "",
    city: supplier?.city ?? "",
    state: supplier?.state ?? "",
    contact_name: supplier?.contact_name ?? "",
    category: supplier?.category ?? "",
    notes: supplier?.notes ?? "",
    status: supplier?.status ?? SUPPLIER_STATUS.active,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function SupplierForm({ mode, supplier }: SupplierFormProps) {
  const router = useRouter();
  const { company } = useTenant();
  const [form, setForm] = useState<SupplierFormState>(() => toFormState(supplier));
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SupplierFormState, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);

  const isCompany = form.person_type === PERSON_TYPES.company;

  function updateField<K extends keyof SupplierFormState>(
    key: K,
    value: SupplierFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSuccess(null);
  }

  function validate() {
    const nextErrors: Partial<Record<keyof SupplierFormState, string>> = {};

    if (!form.full_name.trim()) {
      nextErrors.full_name = "Campo obrigatório";
    }

    if (form.document.trim() && !isValidDocument(form.document, form.person_type)) {
      nextErrors.document = isCompany ? "CNPJ inválido" : "CPF inválido";
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      nextErrors.email = "E-mail inválido";
    }

    if (form.zip_code && onlyDigits(form.zip_code).length !== 8) {
      nextErrors.zip_code = "CEP deve ter 8 dígitos";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleCepBlur() {
    const cep = onlyDigits(form.zip_code);
    if (cep.length !== 8) return;

    setLookingUpCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) return;

      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (data.erro) {
        setFieldErrors((current) => ({
          ...current,
          zip_code: "CEP não encontrado",
        }));
        return;
      }

      setForm((current) => ({
        ...current,
        street: data.logradouro || current.street,
        neighborhood: data.bairro || current.neighborhood,
        city: data.localidade || current.city,
        state: data.uf || current.state,
      }));
    } catch {
      // ViaCEP opcional
    } finally {
      setLookingUpCep(false);
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

    const payload: SupplierInsert = {
      company_id: company.id,
      person_type: form.person_type,
      full_name: form.full_name.trim(),
      trade_name: form.trade_name.trim() || null,
      document: form.document.trim()
        ? formatDocument(form.document, form.person_type)
        : null,
      secondary_document: form.secondary_document.trim() || null,
      email: form.email.trim().toLowerCase() || null,
      phone: form.phone ? formatPhone(form.phone) : null,
      whatsapp: form.whatsapp ? formatPhone(form.whatsapp) : null,
      zip_code: form.zip_code ? formatZipCode(form.zip_code) : null,
      street: form.street.trim() || null,
      number: form.number.trim() || null,
      complement: form.complement.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      city: form.city.trim() || null,
      state: form.state || null,
      contact_name: form.contact_name.trim() || null,
      category: form.category.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status || SUPPLIER_STATUS.active,
    };

    try {
      const result =
        mode === "create"
          ? await createSupplier(payload)
          : await updateSupplier(company.id, supplier!.id, payload);

      if (result.error || !result.data) {
        setError(
          result.error?.message ?? "Não foi possível salvar o fornecedor."
        );
        return;
      }

      setSuccess(
        mode === "create"
          ? "Fornecedor cadastrado com sucesso."
          : "Fornecedor atualizado com sucesso."
      );
      router.push(supplierDetailPath(result.data.id));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro inesperado ao salvar o fornecedor."
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
          <CardTitle>Dados do fornecedor</CardTitle>
          <CardDescription>Informações principais e documento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="person_type">Tipo de pessoa *</Label>
              <Select
                id="person_type"
                value={form.person_type}
                onChange={(e) => {
                  const nextType = e.target.value as PersonType;
                  updateField("person_type", nextType);
                  updateField(
                    "document",
                    form.document
                      ? formatDocument(form.document, nextType)
                      : ""
                  );
                }}
              >
                {PERSON_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                id="status"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                {SUPPLIER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="full_name">
                {isCompany ? "Razão social *" : "Nome completo *"}
              </Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.full_name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome fantasia</Label>
              <Input
                id="trade_name"
                value={form.trade_name}
                onChange={(e) => updateField("trade_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">{isCompany ? "CNPJ" : "CPF"}</Label>
              <Input
                id="document"
                value={form.document}
                onChange={(e) =>
                  updateField(
                    "document",
                    formatDocument(e.target.value, form.person_type)
                  )
                }
                placeholder={
                  isCompany ? "00.000.000/0000-00" : "000.000.000-00"
                }
              />
              <FieldError message={fieldErrors.document} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary_document">
                {isCompany ? "Inscrição estadual" : "RG"}
              </Label>
              <Input
                id="secondary_document"
                value={form.secondary_document}
                onChange={(e) =>
                  updateField("secondary_document", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contato responsável</Label>
              <Input
                id="contact_name"
                value={form.contact_name}
                onChange={(e) => updateField("contact_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                id="category"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                <option value="">Selecione</option>
                {SUPPLIER_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
          <CardDescription>Canais de comunicação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
              <FieldError message={fieldErrors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) =>
                  updateField("phone", formatPhone(e.target.value))
                }
                placeholder="(00) 0000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={form.whatsapp}
                onChange={(e) =>
                  updateField("whatsapp", formatPhone(e.target.value))
                }
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
          <CardDescription>
            Localização do fornecedor
            {lookingUpCep ? " — buscando CEP..." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <Input
                id="zip_code"
                value={form.zip_code}
                onChange={(e) =>
                  updateField("zip_code", formatZipCode(e.target.value))
                }
                onBlur={() => void handleCepBlur()}
                placeholder="00000-000"
              />
              <FieldError message={fieldErrors.zip_code} />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label htmlFor="street">Endereço</Label>
              <Input
                id="street"
                value={form.street}
                onChange={(e) => updateField("street", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Número</Label>
              <Input
                id="number"
                value={form.number}
                onChange={(e) => updateField("number", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={form.complement}
                onChange={(e) => updateField("complement", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                value={form.neighborhood}
                onChange={(e) => updateField("neighborhood", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select
                id="state"
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
              >
                <option value="">Selecione</option>
                {BRAZILIAN_STATES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.value} — {item.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
          <CardDescription>Anotações internas</CardDescription>
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
                supplier ? supplierDetailPath(supplier.id) : ROUTES.suppliers
              )
            }
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading
              ? "Salvando..."
              : mode === "create"
                ? "Cadastrar fornecedor"
                : "Salvar alterações"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
