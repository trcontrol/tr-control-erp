"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ImagePlus, Loader2, Save } from "lucide-react";
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
  BRAZILIAN_STATES,
  COMPANY_LOGOS_BUCKET,
  TAX_REGIMES,
} from "@/lib/constants";
import {
  updateCompanyRecord,
  uploadCompanyLogo,
} from "@/lib/companies/actions";
import {
  formatCnpj,
  formatPhone,
  formatZipCode,
  isValidCnpj,
  isValidEmail,
  onlyDigits,
} from "@/lib/companies/format";
import { useTenant } from "@/providers/tenant-provider";
import type { Company, CompanyUpdate } from "@/types/database";
import type { CompanyWithMembership } from "@/types";

type CompanyFormState = {
  name: string;
  legal_name: string;
  cnpj: string;
  state_registration: string;
  municipal_registration: string;
  tax_regime: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  responsible_name: string;
  notes: string;
  logo_url: string;
};

type CompanyFormProps = {
  company: CompanyWithMembership;
};

const REQUIRED_FIELDS: Array<keyof CompanyFormState> = [
  "name",
  "legal_name",
  "cnpj",
  "zip_code",
  "street",
  "number",
  "neighborhood",
  "city",
  "state",
  "country",
  "phone",
  "email",
  "responsible_name",
];

function toFormState(company: Company): CompanyFormState {
  return {
    name: company.name ?? "",
    legal_name: company.legal_name ?? "",
    cnpj: company.cnpj ? formatCnpj(company.cnpj) : "",
    state_registration: company.state_registration ?? "",
    municipal_registration: company.municipal_registration ?? "",
    tax_regime: company.tax_regime ?? "",
    zip_code: company.zip_code ? formatZipCode(company.zip_code) : "",
    street: company.street ?? "",
    number: company.number ?? "",
    complement: company.complement ?? "",
    neighborhood: company.neighborhood ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    country: company.country ?? "Brasil",
    phone: company.phone ? formatPhone(company.phone) : "",
    whatsapp: company.whatsapp ? formatPhone(company.whatsapp) : "",
    email: company.email ?? "",
    website: company.website ?? "",
    responsible_name: company.responsible_name ?? "",
    notes: company.notes ?? "",
    logo_url: company.logo_url ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function CompanyForm({ company }: CompanyFormProps) {
  const router = useRouter();
  const { updateCompany } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CompanyFormState>(() => toFormState(company));
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CompanyFormState, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);

  const initials = useMemo(
    () =>
      form.name
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "EM",
    [form.name]
  );

  function updateField<K extends keyof CompanyFormState>(
    key: K,
    value: CompanyFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setSuccess(null);
  }

  function validate() {
    const nextErrors: Partial<Record<keyof CompanyFormState, string>> = {};

    for (const field of REQUIRED_FIELDS) {
      if (!form[field].trim()) {
        nextErrors[field] = "Campo obrigatório";
      }
    }

    if (form.cnpj.trim() && !isValidCnpj(form.cnpj)) {
      nextErrors.cnpj = "CNPJ inválido";
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      nextErrors.email = "E-mail inválido";
    }

    if (onlyDigits(form.zip_code).length !== 8) {
      nextErrors.zip_code = "CEP deve ter 8 dígitos";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleCepBlur() {
    const cep = onlyDigits(form.zip_code);
    if (cep.length !== 8) return;

    setLookingUpCep(true);
    setError(null);

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
        country: current.country || "Brasil",
      }));
    } catch {
      // ViaCEP é opcional — não bloqueia o formulário
    } finally {
      setLookingUpCep(false);
    }
  }

  async function handleLogoChange(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Envie um arquivo de imagem válido (JPG, PNG, WEBP ou GIF).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("A logo deve ter no máximo 2 MB.");
      return;
    }

    setUploadingLogo(true);
    setError(null);
    setSuccess(null);

    try {
      const { publicUrl, error: uploadError } = await uploadCompanyLogo(
        company.id,
        file,
        COMPANY_LOGOS_BUCKET
      );

      if (uploadError || !publicUrl) {
        setError(uploadError ?? "Não foi possível enviar a logo.");
        return;
      }

      updateField("logo_url", publicUrl);
      setSuccess("Logo enviada. Clique em Salvar alterações para confirmar.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar a logo."
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validate()) {
      setError("Preencha os campos obrigatórios corretamente.");
      return;
    }

    setLoading(true);

    try {
      const payload: CompanyUpdate = {
        name: form.name.trim(),
        legal_name: form.legal_name.trim(),
        cnpj: formatCnpj(form.cnpj),
        state_registration: form.state_registration.trim() || null,
        municipal_registration: form.municipal_registration.trim() || null,
        tax_regime: form.tax_regime || null,
        zip_code: formatZipCode(form.zip_code),
        street: form.street.trim(),
        number: form.number.trim(),
        complement: form.complement.trim() || null,
        neighborhood: form.neighborhood.trim(),
        city: form.city.trim(),
        state: form.state,
        country: form.country.trim() || "Brasil",
        phone: formatPhone(form.phone),
        whatsapp: form.whatsapp ? formatPhone(form.whatsapp) : null,
        email: form.email.trim().toLowerCase(),
        website: form.website.trim() || null,
        responsible_name: form.responsible_name.trim(),
        notes: form.notes.trim() || null,
        logo_url: form.logo_url || null,
      };

      const { data, error: updateError } = await updateCompanyRecord(
        company.id,
        payload
      );

      if (updateError || !data) {
        setError(updateError?.message ?? "Não foi possível salvar as alterações.");
        return;
      }

      updateCompany(data);
      setSuccess("Alterações salvas com sucesso.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as alterações."
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
          <CardDescription>
            Dados principais e fiscais da empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 rounded-xl">
              {form.logo_url ? (
                <AvatarImage
                  src={form.logo_url}
                  alt={form.name || "Logo da empresa"}
                  className="rounded-xl object-cover"
                />
              ) : null}
              <AvatarFallback className="rounded-xl text-lg">
                {initials || <Building2 className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo da empresa</Label>
              <input
                ref={fileInputRef}
                id="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={uploadingLogo}
                onChange={(event) =>
                  void handleLogoChange(event.target.files?.[0] ?? null)
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {uploadingLogo ? "Enviando..." : "Enviar logo"}
                </Button>
                {form.logo_url ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => updateField("logo_url", "")}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP ou GIF até 2 MB
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome fantasia *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Razão social *</Label>
              <Input
                id="legal_name"
                value={form.legal_name}
                onChange={(e) => updateField("legal_name", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.legal_name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => updateField("cnpj", formatCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                required
              />
              <FieldError message={fieldErrors.cnpj} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_regime">Regime tributário</Label>
              <Select
                id="tax_regime"
                value={form.tax_regime}
                onChange={(e) => updateField("tax_regime", e.target.value)}
              >
                <option value="">Selecione</option>
                {TAX_REGIMES.map((regime) => (
                  <option key={regime.value} value={regime.value}>
                    {regime.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="state_registration">Inscrição estadual</Label>
              <Input
                id="state_registration"
                value={form.state_registration}
                onChange={(e) =>
                  updateField("state_registration", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipal_registration">
                Inscrição municipal
              </Label>
              <Input
                id="municipal_registration"
                value={form.municipal_registration}
                onChange={(e) =>
                  updateField("municipal_registration", e.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
          <CardDescription>
            Localização oficial da empresa
            {lookingUpCep ? " — buscando CEP..." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP *</Label>
              <Input
                id="zip_code"
                value={form.zip_code}
                onChange={(e) =>
                  updateField("zip_code", formatZipCode(e.target.value))
                }
                onBlur={() => void handleCepBlur()}
                placeholder="00000-000"
                required
              />
              <FieldError message={fieldErrors.zip_code} />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label htmlFor="street">Endereço *</Label>
              <Input
                id="street"
                value={form.street}
                onChange={(e) => updateField("street", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.street} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Número *</Label>
              <Input
                id="number"
                value={form.number}
                onChange={(e) => updateField("number", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.number} />
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
              <Label htmlFor="neighborhood">Bairro *</Label>
              <Input
                id="neighborhood"
                value={form.neighborhood}
                onChange={(e) => updateField("neighborhood", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.neighborhood} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.city} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado *</Label>
              <Select
                id="state"
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {BRAZILIAN_STATES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.value} — {item.label}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.state} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="country">País *</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.country} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
          <CardDescription>Canais oficiais da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) =>
                  updateField("phone", formatPhone(e.target.value))
                }
                placeholder="(00) 0000-0000"
                required
              />
              <FieldError message={fieldErrors.phone} />
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
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
              <FieldError message={fieldErrors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Site</Label>
              <Input
                id="website"
                type="url"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responsável e observações</CardTitle>
          <CardDescription>
            Informações complementares do cadastro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="responsible_name">
              Responsável pela empresa *
            </Label>
            <Input
              id="responsible_name"
              value={form.responsible_name}
              onChange={(e) =>
                updateField("responsible_name", e.target.value)
              }
              required
            />
            <FieldError message={fieldErrors.responsible_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={4}
              placeholder="Anotações internas sobre a empresa"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t px-6 py-4">
          <Button type="submit" disabled={loading || uploadingLogo}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
