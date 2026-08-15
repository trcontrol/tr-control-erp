"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createCompanyWithOwnerInviteAction } from "@/lib/admin/companies-admin-actions";
import {
  COMPANY_PLAN_OPTIONS,
  COMPANY_STATUS_OPTIONS,
  slugifyCompanyName,
} from "@/lib/admin/companies-admin-shared";
import { COMPANY_PLANS, COMPANY_STATUSES } from "@/lib/constants";
import { formatCnpj, formatPhone, onlyDigits } from "@/lib/companies/format";

type NewCompanyFormProps = {
  onSuccess: (result: {
    companyId: string;
    inviteId: string;
    emailSent: boolean;
    message: string;
    emailError: string | null;
  }) => void;
  onCancel: () => void;
};

export function NewCompanyForm({ onSuccess, onCancel }: NewCompanyFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState(COMPANY_PLANS.essential);
  const [status, setStatus] = useState(COMPANY_STATUSES.active);
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugifyCompanyName(name));
    }
  }, [name, slugTouched]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createCompanyWithOwnerInviteAction({
        name,
        legalName: legalName || undefined,
        slug,
        cnpj: onlyDigits(cnpj) || undefined,
        email: email || undefined,
        phone: phone || undefined,
        plan,
        status,
        ownerFullName,
        ownerEmail,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      onSuccess({
        companyId: result.companyId,
        inviteId: result.inviteId,
        emailSent: result.emailSent,
        message: result.message,
        emailError: result.emailError,
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--brand-navy)]">
          Dados da empresa
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="company-name">Nome *</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Acme Comércio"
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="company-legal-name">Razão social</Label>
            <Input
              id="company-legal-name"
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-slug">Slug *</Label>
            <Input
              id="company-slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value.toLowerCase());
              }}
              placeholder="acme-comercio"
              required
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              Identificador único (minúsculas, números e hífens).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-cnpj">CNPJ</Label>
            <Input
              id="company-cnpj"
              value={cnpj}
              onChange={(event) => setCnpj(formatCnpj(event.target.value))}
              placeholder="00.000.000/0000-00"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-email">E-mail da empresa</Label>
            <Input
              id="company-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-phone">Telefone</Label>
            <Input
              id="company-phone"
              value={phone}
              onChange={(event) => setPhone(formatPhone(event.target.value))}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-plan">Plano *</Label>
            <Select
              id="company-plan"
              value={plan}
              onChange={(event) =>
                setPlan(event.target.value as typeof plan)
              }
              disabled={pending}
              required
            >
              {COMPANY_PLAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-status">Status *</Label>
            <Select
              id="company-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
              disabled={pending}
              required
            >
              {COMPANY_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-[var(--brand-navy)]/10 pt-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--brand-navy)]">
            Owner inicial
          </h3>
          <p className="text-xs text-muted-foreground">
            Receberá o convite para definir senha e entrar como proprietário
            (perfil Administrator completo).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="owner-full-name">Nome do Owner *</Label>
            <Input
              id="owner-full-name"
              value={ownerFullName}
              onChange={(event) => setOwnerFullName(event.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner-email">E-mail do Owner *</Label>
            <Input
              id="owner-email"
              type="email"
              value={ownerEmail}
              onChange={(event) => setOwnerEmail(event.target.value)}
              required
              disabled={pending}
            />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--brand-navy)]/10 pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando...
            </>
          ) : (
            "Criar empresa e convidar Owner"
          )}
        </Button>
      </div>
    </form>
  );
}
