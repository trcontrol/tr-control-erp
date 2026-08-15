"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ChangePasswordButton } from "@/components/settings/change-password-dialog";
import { BRAZILIAN_STATES } from "@/lib/constants";
import { formatCnpj, isValidEmail } from "@/lib/companies/format";
import {
  getActiveCompanySettingsAction,
  getOwnAccountSettingsAction,
  updateCompanySettingsAction,
  updateOwnAccountSettingsAction,
  type ActiveCompanySettings,
  type OwnAccountSettings,
} from "@/lib/settings/actions";
import { useTenant } from "@/providers/tenant-provider";
import { PERMISSION_MODULES } from "@/lib/users/permissions";
import { cn } from "@/lib/utils";

const LEGACY_STORAGE_KEYS = [
  "tr-control.settings.account",
  "tr-control.settings.company",
  "tr-control.settings.preferences",
  "tr-control.settings.notifications",
] as const;

function clearLegacySettingsStorage() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

const fieldClassName = cn(
  "h-10 rounded-lg border-input/80 bg-white/80 text-[13.5px] text-[var(--brand-navy)]",
  "focus-visible:border-[var(--brand-coral)]/45 focus-visible:ring-2 focus-visible:ring-[var(--brand-coral)]/25"
);

const primaryBtn = cn(
  "h-10 min-w-[148px] rounded-lg bg-[var(--brand-coral)] px-5 text-white",
  "hover:bg-[var(--brand-coral)]/88"
);

type CompanyFormState = {
  name: string;
  legalName: string;
  cnpj: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
};

function companyToForm(company: ActiveCompanySettings): CompanyFormState {
  return {
    name: company.name ?? "",
    legalName: company.legalName ?? "",
    cnpj: company.cnpj ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    street: company.street ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
  };
}

export function SettingsBoard() {
  const { company, editableModules, updateCompany } = useTenant();
  const canEditCompany = editableModules.includes(PERMISSION_MODULES.settings);
  const activeCompanyId = company?.id ?? null;

  const [account, setAccount] = useState<OwnAccountSettings | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState(false);

  const [companyForm, setCompanyForm] = useState<CompanyFormState | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companySuccess, setCompanySuccess] = useState(false);

  const loadAccount = useCallback(async () => {
    setAccountLoading(true);
    setAccountError(null);
    const result = await getOwnAccountSettingsAction();
    if (result.error || !result.data) {
      setAccount(null);
      setAccountName("");
      setAccountError(result.error?.message ?? "Falha ao carregar a conta.");
      setAccountLoading(false);
      return;
    }
    setAccount(result.data);
    setAccountName(result.data.fullName);
    setAccountLoading(false);
  }, []);

  const loadCompany = useCallback(async () => {
    if (!activeCompanyId) {
      setCompanyForm(null);
      setCompanyLoading(false);
      return;
    }

    setCompanyLoading(true);
    setCompanyError(null);
    setCompanySuccess(false);

    const result = await getActiveCompanySettingsAction();
    if (result.error || !result.data) {
      setCompanyForm(null);
      setCompanyError(
        result.error?.message ?? "Falha ao carregar a empresa ativa."
      );
      setCompanyLoading(false);
      return;
    }

    // Garante que a resposta é da empresa ativa atual (evita race ao trocar tenant).
    if (result.data.id !== activeCompanyId) {
      setCompanyLoading(false);
      return;
    }

    setCompanyForm(companyToForm(result.data));
    setCompanyLoading(false);
  }, [activeCompanyId]);

  useEffect(() => {
    clearLegacySettingsStorage();
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    clearLegacySettingsStorage();
    void loadCompany();
  }, [loadCompany]);

  async function handleSaveAccount() {
    setAccountError(null);
    setAccountSuccess(false);
    setAccountSaving(true);

    const result = await updateOwnAccountSettingsAction({
      fullName: accountName,
    });

    setAccountSaving(false);

    if (result.error || !result.data) {
      setAccountError(result.error?.message ?? "Falha ao salvar a conta.");
      return;
    }

    setAccount(result.data);
    setAccountName(result.data.fullName);
    setAccountSuccess(true);
  }

  async function handleSaveCompany() {
    if (!companyForm || !activeCompanyId || !canEditCompany) return;

    setCompanyError(null);
    setCompanySuccess(false);

    const name = companyForm.name.trim();
    if (!name) {
      setCompanyError("Informe o nome da empresa.");
      return;
    }

    const email = companyForm.email.trim();
    if (email && !isValidEmail(email)) {
      setCompanyError("Informe um e-mail válido da empresa.");
      return;
    }

    setCompanySaving(true);

    const result = await updateCompanySettingsAction({
      companyId: activeCompanyId,
      name,
      legalName: companyForm.legalName.trim() || null,
      cnpj: companyForm.cnpj.trim()
        ? formatCnpj(companyForm.cnpj)
        : null,
      phone: companyForm.phone.trim() || null,
      email: email || null,
      street: companyForm.street.trim() || null,
      city: companyForm.city.trim() || null,
      state: companyForm.state.trim() || null,
    });

    setCompanySaving(false);

    if (result.error || !result.data) {
      setCompanyError(result.error?.message ?? "Falha ao salvar a empresa.");
      return;
    }

    updateCompany(result.data);

    setCompanyForm(
      companyToForm({
        id: result.data.id,
        name: result.data.name,
        legalName: result.data.legal_name,
        cnpj: result.data.cnpj,
        phone: result.data.phone,
        email: result.data.email,
        street: result.data.street,
        number: result.data.number,
        complement: result.data.complement,
        neighborhood: result.data.neighborhood,
        city: result.data.city,
        state: result.data.state,
        zipCode: result.data.zip_code,
      })
    );
    setCompanySuccess(true);
  }

  const accountDirty =
    account != null && accountName.trim() !== (account.fullName ?? "").trim();

  return (
    <div className="space-y-7">
      {/* Minha Conta — pessoal; não exige settings.edit */}
      <Card className="border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-sky-50/40 to-white shadow-sm">
        <CardHeader>
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100/90 text-sky-800 ring-1 ring-inset ring-sky-300/40">
              <User className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-xl text-[var(--brand-navy)]">
                Minha Conta
              </CardTitle>
              <CardDescription>
                Dados pessoais do usuário autenticado. Independem da empresa
                ativa.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {accountLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando conta...
            </div>
          ) : (
            <>
              {accountSuccess ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Dados da conta atualizados com sucesso.
                </div>
              ) : null}
              {accountError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {accountError}
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="account-name">Nome</Label>
                  <Input
                    id="account-name"
                    className={fieldClassName}
                    value={accountName}
                    onChange={(event) => {
                      setAccountSuccess(false);
                      setAccountName(event.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="account-email">E-mail</Label>
                  <Input
                    id="account-email"
                    className={fieldClassName}
                    value={account?.email ?? ""}
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    O e-mail é utilizado para acesso ao sistema.
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Senha</Label>
                  <div>
                    <ChangePasswordButton disabled={accountLoading} />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="justify-end border-t border-sky-200/50 pt-5">
          <Button
            type="button"
            className={primaryBtn}
            disabled={accountLoading || accountSaving || !accountDirty}
            onClick={() => void handleSaveAccount()}
          >
            {accountSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Salvar conta
          </Button>
        </CardFooter>
      </Card>

      {/* Empresa — requer settings.edit para mutar */}
      <Card className="border-slate-300/60 bg-gradient-to-br from-slate-100/80 via-slate-50/50 to-white shadow-sm">
        <CardHeader>
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200/70 text-[var(--brand-navy)] ring-1 ring-inset ring-slate-300/50">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-xl text-[var(--brand-navy)]">
                Empresa
              </CardTitle>
              <CardDescription>
                Dados cadastrais da empresa ativa
                {company ? ` (${company.name})` : ""}.
                {!canEditCompany
                  ? " Você possui somente visualização."
                  : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeCompanyId ? (
            <p className="text-sm text-muted-foreground">
              Selecione uma empresa ativa para gerenciar o cadastro.
            </p>
          ) : companyLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando empresa...
            </div>
          ) : !companyForm ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {companyError ?? "Não foi possível carregar a empresa ativa."}
            </div>
          ) : (
            <>
              {companySuccess ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Dados da empresa atualizados com sucesso.
                </div>
              ) : null}
              {companyError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {companyError}
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="company-name">Nome da empresa</Label>
                  <Input
                    id="company-name"
                    className={fieldClassName}
                    value={companyForm.name}
                    disabled={!canEditCompany}
                    readOnly={!canEditCompany}
                    onChange={(event) => {
                      setCompanySuccess(false);
                      setCompanyForm((current) =>
                        current
                          ? { ...current, name: event.target.value }
                          : current
                      );
                    }}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="company-legal">Razão social</Label>
                  <Input
                    id="company-legal"
                    className={fieldClassName}
                    value={companyForm.legalName}
                    disabled={!canEditCompany}
                    readOnly={!canEditCompany}
                    onChange={(event) => {
                      setCompanySuccess(false);
                      setCompanyForm((current) =>
                        current
                          ? { ...current, legalName: event.target.value }
                          : current
                      );
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-cnpj">CNPJ</Label>
                  <Input
                    id="company-cnpj"
                    className={fieldClassName}
                    value={companyForm.cnpj}
                    disabled={!canEditCompany}
                    readOnly={!canEditCompany}
                    onChange={(event) => {
                      setCompanySuccess(false);
                      setCompanyForm((current) =>
                        current
                          ? { ...current, cnpj: event.target.value }
                          : current
                      );
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Telefone</Label>
                  <Input
                    id="company-phone"
                    className={fieldClassName}
                    value={companyForm.phone}
                    disabled={!canEditCompany}
                    readOnly={!canEditCompany}
                    onChange={(event) => {
                      setCompanySuccess(false);
                      setCompanyForm((current) =>
                        current
                          ? { ...current, phone: event.target.value }
                          : current
                      );
                    }}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="company-email">E-mail da empresa</Label>
                  <Input
                    id="company-email"
                    type="email"
                    className={fieldClassName}
                    value={companyForm.email}
                    disabled={!canEditCompany}
                    readOnly={!canEditCompany}
                    onChange={(event) => {
                      setCompanySuccess(false);
                      setCompanyForm((current) =>
                        current
                          ? { ...current, email: event.target.value }
                          : current
                      );
                    }}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="company-street">Endereço</Label>
                  <Input
                    id="company-street"
                    className={fieldClassName}
                    value={companyForm.street}
                    disabled={!canEditCompany}
                    readOnly={!canEditCompany}
                    onChange={(event) => {
                      setCompanySuccess(false);
                      setCompanyForm((current) =>
                        current
                          ? { ...current, street: event.target.value }
                          : current
                      );
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-city">Cidade</Label>
                  <Input
                    id="company-city"
                    className={fieldClassName}
                    value={companyForm.city}
                    disabled={!canEditCompany}
                    readOnly={!canEditCompany}
                    onChange={(event) => {
                      setCompanySuccess(false);
                      setCompanyForm((current) =>
                        current
                          ? { ...current, city: event.target.value }
                          : current
                      );
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-state">Estado</Label>
                  <Select
                    id="company-state"
                    className={fieldClassName}
                    value={companyForm.state}
                    disabled={!canEditCompany}
                    onChange={(event) => {
                      setCompanySuccess(false);
                      setCompanyForm((current) =>
                        current
                          ? { ...current, state: event.target.value }
                          : current
                      );
                    }}
                  >
                    <option value="">Selecione</option>
                    {BRAZILIAN_STATES.map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </>
          )}
        </CardContent>
        {canEditCompany ? (
          <CardFooter className="justify-end border-t border-slate-200/60 pt-5">
            <Button
              type="button"
              className={primaryBtn}
              disabled={
                companyLoading ||
                companySaving ||
                !companyForm ||
                !activeCompanyId
              }
              onClick={() => void handleSaveCompany()}
            >
              {companySaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Salvar empresa
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
