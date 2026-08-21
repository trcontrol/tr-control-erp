"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Search } from "lucide-react";
import { CnpjLookupMetaInfo } from "@/components/cnpj/cnpj-lookup-meta";
import { CnpjStateRegistrationHint } from "@/components/cnpj/cnpj-state-registration-hint";
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
import { useCnpjLookup } from "@/hooks/use-cnpj-lookup";
import {
  BRAZILIAN_STATES,
  CUSTOMER_STATUS,
  CUSTOMER_STATUS_OPTIONS,
  PERSON_TYPES,
  PERSON_TYPE_OPTIONS,
  ROUTES,
  customerDetailPath,
  type PersonType,
} from "@/lib/constants";
import { createCustomer, updateCustomer } from "@/lib/customers/actions";
import {
  formatDocument,
  formatPhone,
  formatZipCode,
} from "@/lib/customers/format";
import {
  normalizeCustomerPayload,
  validateCustomerPayload,
} from "@/lib/customers/validate";
import type { Customer } from "@/types/database";

type CustomerFormState = {
  person_type: PersonType;
  full_name: string;
  trade_name: string;
  document: string;
  secondary_document: string;
  birth_date: string;
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
  notes: string;
  status: string;
};

type CustomerFormProps = {
  companyId: string;
  customer?: Customer;
  mode: "create" | "edit";
};

function toFormState(customer?: Customer): CustomerFormState {
  const personType =
    customer?.person_type === PERSON_TYPES.company
      ? PERSON_TYPES.company
      : PERSON_TYPES.individual;

  return {
    person_type: personType,
    full_name: customer?.full_name ?? "",
    trade_name: customer?.trade_name ?? "",
    document: customer?.document
      ? formatDocument(customer.document, personType)
      : "",
    secondary_document: customer?.secondary_document ?? "",
    birth_date: customer?.birth_date ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ? formatPhone(customer.phone) : "",
    whatsapp: customer?.whatsapp ? formatPhone(customer.whatsapp) : "",
    zip_code: customer?.zip_code ? formatZipCode(customer.zip_code) : "",
    street: customer?.street ?? "",
    number: customer?.number ?? "",
    complement: customer?.complement ?? "",
    neighborhood: customer?.neighborhood ?? "",
    city: customer?.city ?? "",
    state: customer?.state ?? "",
    notes: customer?.notes ?? "",
    status: customer?.status ?? CUSTOMER_STATUS.active,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function CustomerForm({ companyId, customer, mode }: CustomerFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<CustomerFormState>(() => toFormState(customer));
  const formRef = useRef(form);
  formRef.current = form;
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CustomerFormState, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);

  const {
    lookingUp: lookingUpCnpj,
    meta: cnpjMeta,
    clearMeta: clearCnpjMeta,
    notifyDocumentChange,
    lookup: lookupCnpj,
  } = useCnpjLookup({
    getForm: () => formRef.current,
    setForm,
    onMessage: (message, tone) => {
      if (tone === "success") {
        setError(null);
        setSuccess(message);
      } else {
        setSuccess(null);
        setError(message);
      }
    },
  });

  const isCompany = form.person_type === PERSON_TYPES.company;

  function updateField<K extends keyof CustomerFormState>(
    key: K,
    value: CustomerFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSuccess(null);
  }

  function handlePersonTypeChange(nextType: PersonType) {
    setForm((current) => {
      const next = {
        ...current,
        person_type: nextType,
        document: current.document
          ? formatDocument(current.document, nextType)
          : "",
        secondary_document: "",
      };

      if (nextType === PERSON_TYPES.company) {
        next.birth_date = "";
      } else {
        next.trade_name = "";
        clearCnpjMeta();
      }

      return next;
    });
    setFieldErrors((current) => ({
      ...current,
      person_type: undefined,
      document: undefined,
      trade_name: undefined,
      birth_date: undefined,
      secondary_document: undefined,
    }));
    setSuccess(null);
  }

  async function handleCepBlur() {
    const cep = form.zip_code.replace(/\D/g, "");
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

    const validation = validateCustomerPayload(form);
    if (!validation.ok) {
      setFieldErrors(validation.fields);
      setError(validation.message);
      return;
    }

    setLoading(true);

    const payload = normalizeCustomerPayload({
      ...form,
      company_id: companyId,
    });

    try {
      const result =
        mode === "create"
          ? await createCustomer(payload)
          : await updateCustomer(companyId, customer!.id, payload);

      if (result.error || !result.data) {
        setError(result.error?.message ?? "Não foi possível salvar o cliente.");
        return;
      }

      setSuccess(
        mode === "create"
          ? "Cliente cadastrado com sucesso."
          : "Cliente atualizado com sucesso."
      );
      router.push(customerDetailPath(result.data.id));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro inesperado ao salvar o cliente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
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
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
          <CardDescription>
            Tipo de pessoa, nome e documento (CPF/CNPJ opcional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="person_type">Tipo de pessoa *</Label>
              <Select
                id="person_type"
                value={form.person_type}
                onChange={(e) =>
                  handlePersonTypeChange(e.target.value as PersonType)
                }
              >
                {PERSON_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.person_type} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                id="status"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                {CUSTOMER_STATUS_OPTIONS.map((option) => (
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
            {isCompany ? (
              <div className="space-y-2">
                <Label htmlFor="trade_name">Nome fantasia</Label>
                <Input
                  id="trade_name"
                  value={form.trade_name}
                  onChange={(e) => updateField("trade_name", e.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="document">{isCompany ? "CNPJ" : "CPF"}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="document"
                  value={form.document}
                  onChange={(e) => {
                    const next = formatDocument(
                      e.target.value,
                      form.person_type
                    );
                    updateField("document", next);
                    notifyDocumentChange(next);
                  }}
                  onBlur={(e) => {
                    if (isCompany) {
                      void lookupCnpj(e.currentTarget.value);
                    }
                  }}
                  placeholder={
                    isCompany ? "00.000.000/0000-00" : "000.000.000-00"
                  }
                />
                {isCompany ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    disabled={lookingUpCnpj}
                    onClick={() =>
                      void lookupCnpj(form.document, { force: true })
                    }
                  >
                    {lookingUpCnpj ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {lookingUpCnpj
                      ? "Consultando..."
                      : "Buscar dados do CNPJ"}
                  </Button>
                ) : null}
              </div>
              <FieldError message={fieldErrors.document} />
              {isCompany && cnpjMeta ? (
                <CnpjLookupMetaInfo meta={cnpjMeta} />
              ) : null}
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
              {isCompany && cnpjMeta?.missingStateRegistration ? (
                <CnpjStateRegistrationHint />
              ) : null}
            </div>
            {!isCompany ? (
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => updateField("birth_date", e.target.value)}
                />
              </div>
            ) : null}
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
            Localização do cliente
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
            placeholder="Informações adicionais sobre o cliente"
          />
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push(
                customer
                  ? customerDetailPath(customer.id)
                  : ROUTES.customers
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
                ? "Cadastrar cliente"
                : "Salvar alterações"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
