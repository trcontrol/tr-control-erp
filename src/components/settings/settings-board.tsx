"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Bell,
  Building2,
  KeyRound,
  Languages,
  Monitor,
  Settings2,
  Shield,
  Smartphone,
  User,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { isValidEmail } from "@/lib/companies/format";
import { BRAZILIAN_STATES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STORAGE_KEYS = {
  account: "tr-control.settings.account",
  company: "tr-control.settings.company",
  preferences: "tr-control.settings.preferences",
  notifications: "tr-control.settings.notifications",
} as const;

const DEFAULT_NOTIFICATIONS = {
  email: true,
  system: true,
  whatsapp: false,
};

const MOCK_ACCOUNT = {
  name: "Ana Paula Ribeiro",
  email: "ana.ribeiro@trcontrol.demo",
  phone: "(11) 98765-4321",
};

const MOCK_COMPANY = {
  name: "TR Studio Design LTDA",
  cnpj: "12.345.678/0001-90",
  address: "Av. Paulista, 1578 — Conj. 1204",
  city: "São Paulo",
  state: "SP",
};

const DEFAULT_PREFERENCES = {
  language: "pt-BR",
  dateFormat: "dd/MM/yyyy",
  currency: "BRL",
  timezone: "America/Sao_Paulo",
};

type AccountForm = typeof MOCK_ACCOUNT;
type CompanyForm = typeof MOCK_COMPANY;
type PreferencesForm = typeof DEFAULT_PREFERENCES;
type NotificationsForm = typeof DEFAULT_NOTIFICATIONS;

function isBasicCnpjFormat(value: string) {
  return value.replace(/\D/g, "").length === 14;
}

function accountEquals(a: AccountForm, b: AccountForm) {
  return a.name === b.name && a.email === b.email && a.phone === b.phone;
}

function companyEquals(a: CompanyForm, b: CompanyForm) {
  return (
    a.name === b.name &&
    a.cnpj === b.cnpj &&
    a.address === b.address &&
    a.city === b.city &&
    a.state === b.state
  );
}

function preferencesEquals(a: PreferencesForm, b: PreferencesForm) {
  return (
    a.language === b.language &&
    a.dateFormat === b.dateFormat &&
    a.currency === b.currency &&
    a.timezone === b.timezone
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(
  source: Record<string, unknown>,
  key: string,
  fallback: string
) {
  const value = source[key];
  return typeof value === "string" ? value : fallback;
}

function readBooleanField(
  source: Record<string, unknown>,
  key: string,
  fallback: boolean
) {
  const value = source[key];
  return typeof value === "boolean" ? value : fallback;
}

function parseStoredAccount(value: unknown): AccountForm | null {
  if (!isRecord(value)) return null;

  return {
    name: readStringField(value, "name", MOCK_ACCOUNT.name),
    email: readStringField(value, "email", MOCK_ACCOUNT.email),
    phone: readStringField(value, "phone", MOCK_ACCOUNT.phone),
  };
}

function parseStoredCompany(value: unknown): CompanyForm | null {
  if (!isRecord(value)) return null;

  return {
    name: readStringField(value, "name", MOCK_COMPANY.name),
    cnpj: readStringField(value, "cnpj", MOCK_COMPANY.cnpj),
    address: readStringField(value, "address", MOCK_COMPANY.address),
    city: readStringField(value, "city", MOCK_COMPANY.city),
    state: readStringField(value, "state", MOCK_COMPANY.state),
  };
}

function parseStoredPreferences(value: unknown): PreferencesForm | null {
  if (!isRecord(value)) return null;

  return {
    language: readStringField(value, "language", DEFAULT_PREFERENCES.language),
    dateFormat: readStringField(
      value,
      "dateFormat",
      DEFAULT_PREFERENCES.dateFormat
    ),
    currency: readStringField(value, "currency", DEFAULT_PREFERENCES.currency),
    timezone: readStringField(value, "timezone", DEFAULT_PREFERENCES.timezone),
  };
}

function parseStoredNotifications(value: unknown): NotificationsForm | null {
  if (!isRecord(value)) return null;

  return {
    email: readBooleanField(value, "email", DEFAULT_NOTIFICATIONS.email),
    system: readBooleanField(value, "system", DEFAULT_NOTIFICATIONS.system),
    whatsapp: readBooleanField(
      value,
      "whatsapp",
      DEFAULT_NOTIFICATIONS.whatsapp
    ),
  };
}

function readLocalStorageJson(key: string): unknown | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeLocalStorageJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable; keep in-memory state.
  }
}

const MOCK_SESSIONS = [
  {
    id: "1",
    device: "Chrome · Windows",
    location: "São Paulo, BR",
    lastActive: "Agora",
    current: true,
  },
  {
    id: "2",
    device: "Safari · iPhone",
    location: "São Paulo, BR",
    lastActive: "Há 2 horas",
    current: false,
  },
  {
    id: "3",
    device: "Edge · Windows",
    location: "Campinas, BR",
    lastActive: "Ontem, 18:42",
    current: false,
  },
] as const;

type MockSession = {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
};

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

type NotificationKey = "email" | "system" | "whatsapp";

type SectionTone = {
  card: string;
  icon: string;
  iconColor: string;
  footer: string;
};

const SECTION_TONES = {
  account: {
    card: "border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-sky-50/40 to-white shadow-sm",
    icon: "bg-sky-100/90 text-sky-800 ring-1 ring-inset ring-sky-300/40",
    iconColor: "text-sky-800",
    footer: "border-sky-200/50",
  },
  company: {
    card: "border-slate-300/60 bg-gradient-to-br from-slate-100/80 via-slate-50/50 to-white shadow-sm",
    icon: "bg-slate-200/70 text-[var(--brand-navy)] ring-1 ring-inset ring-slate-300/50",
    iconColor: "text-[var(--brand-navy)]",
    footer: "border-slate-200/60",
  },
  security: {
    card: "border-[var(--brand-gold)]/30 bg-gradient-to-br from-[var(--brand-gold)]/[0.12] via-[var(--brand-gold)]/[0.04] to-white shadow-sm",
    icon: "bg-[var(--brand-gold)]/20 text-[var(--brand-navy)] ring-1 ring-inset ring-[var(--brand-gold)]/35",
    iconColor: "text-[var(--brand-navy)]",
    footer: "border-[var(--brand-gold)]/25",
  },
  notifications: {
    card: "border-[var(--brand-coral)]/25 bg-gradient-to-br from-[var(--brand-coral)]/[0.10] via-[var(--brand-coral)]/[0.04] to-white shadow-sm",
    icon: "bg-[var(--brand-coral)]/15 text-[var(--brand-coral)] ring-1 ring-inset ring-[var(--brand-coral)]/30",
    iconColor: "text-[var(--brand-coral)]",
    footer: "border-[var(--brand-coral)]/20",
  },
  appearance: {
    card: "border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-violet-50/35 to-white shadow-sm",
    icon: "bg-violet-100/90 text-violet-800 ring-1 ring-inset ring-violet-300/40",
    iconColor: "text-violet-800",
    footer: "border-violet-200/50",
  },
} as const satisfies Record<string, SectionTone>;

const fieldControlClassName = cn(
  "h-10 rounded-lg border-input/80 bg-white/80 text-[13.5px] text-[var(--brand-navy)] shadow-none",
  "placeholder:text-muted-foreground/70",
  "transition-[border-color,box-shadow,background-color] duration-150",
  "hover:border-[var(--brand-navy)]/25 hover:bg-white",
  "focus-visible:border-[var(--brand-coral)]/45 focus-visible:bg-white",
  "focus-visible:ring-2 focus-visible:ring-[var(--brand-coral)]/25"
);

const primaryButtonClassName = cn(
  "h-10 min-w-[148px] rounded-lg px-5",
  "bg-[var(--brand-coral)] text-white shadow-sm",
  "transition-all duration-150",
  "hover:bg-[var(--brand-coral)]/88 hover:shadow-md hover:brightness-[1.03]",
  "active:translate-y-px active:shadow-sm"
);

const outlineButtonClassName = cn(
  "h-10 min-w-[132px] rounded-lg border-[var(--brand-navy)]/18 bg-white/85 px-4",
  "text-[var(--brand-navy)] shadow-none",
  "transition-all duration-150",
  "hover:border-[var(--brand-navy)]/30 hover:bg-[var(--brand-navy)]/[0.05] hover:text-[var(--brand-navy)]",
  "active:translate-y-px"
);

const ghostButtonClassName = cn(
  "h-9 rounded-lg px-3 text-[var(--brand-navy)]/75",
  "transition-all duration-150",
  "hover:bg-[var(--brand-coral)]/10 hover:text-[var(--brand-coral)]"
);

function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onCheckedChange(!checked);
      }}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-coral)]/35",
        checked ? "bg-[var(--brand-coral)]" : "bg-slate-300/80",
        disabled && "cursor-not-allowed opacity-45"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

function SettingsField({
  id,
  label,
  children,
  className,
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <Label
        htmlFor={id}
        className="text-[13px] font-medium text-[var(--brand-navy)]/80"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function SectionIcon({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className: string;
}) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
        className
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </span>
  );
}

function SectionHeader({
  icon,
  iconClassName,
  title,
  description,
}: {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <SectionIcon icon={icon} className={iconClassName} />
      <div className="min-w-0 space-y-1.5 pt-0.5">
        <CardTitle className="text-xl font-semibold tracking-tight text-[var(--brand-navy)]">
          {title}
        </CardTitle>
        <CardDescription className="text-[13.5px] leading-relaxed text-[var(--brand-navy)]/60">
          {description}
        </CardDescription>
      </div>
    </div>
  );
}

function NestedPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--brand-navy)]/[0.08] bg-white/70 p-4 sm:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

function NestedIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-navy)]/[0.06] text-[var(--brand-navy)]/70 ring-1 ring-inset ring-[var(--brand-navy)]/10">
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}

export function SettingsBoard() {
  const [account, setAccount] = useState(MOCK_ACCOUNT);
  const [savedAccount, setSavedAccount] = useState(MOCK_ACCOUNT);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState(false);

  const [company, setCompany] = useState(MOCK_COMPANY);
  const [savedCompany, setSavedCompany] = useState(MOCK_COMPANY);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companySuccess, setCompanySuccess] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<MockSession[]>(
    MOCK_SESSIONS.map((session) => ({ ...session }))
  );
  const [notifications, setNotifications] =
    useState<NotificationsForm>(DEFAULT_NOTIFICATIONS);
  const [notificationFeedback, setNotificationFeedback] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [savedPreferences, setSavedPreferences] = useState(DEFAULT_PREFERENCES);
  const [preferencesSuccess, setPreferencesSuccess] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [twoFactorConfirmChecked, setTwoFactorConfirmChecked] = useState(false);
  const [disableTwoFactorOpen, setDisableTwoFactorOpen] = useState(false);

  const [sessionToEnd, setSessionToEnd] = useState<MockSession | null>(null);

  const accountDirty = !accountEquals(account, savedAccount);
  const companyDirty = !companyEquals(company, savedCompany);
  const preferencesDirty = !preferencesEquals(preferences, savedPreferences);

  useEffect(() => {
    const storedAccount = parseStoredAccount(
      readLocalStorageJson(STORAGE_KEYS.account)
    );
    if (storedAccount) {
      setAccount(storedAccount);
      setSavedAccount(storedAccount);
    }

    const storedCompany = parseStoredCompany(
      readLocalStorageJson(STORAGE_KEYS.company)
    );
    if (storedCompany) {
      setCompany(storedCompany);
      setSavedCompany(storedCompany);
    }

    const storedPreferences = parseStoredPreferences(
      readLocalStorageJson(STORAGE_KEYS.preferences)
    );
    if (storedPreferences) {
      setPreferences(storedPreferences);
      setSavedPreferences(storedPreferences);
    }

    const storedNotifications = parseStoredNotifications(
      readLocalStorageJson(STORAGE_KEYS.notifications)
    );
    if (storedNotifications) {
      setNotifications(storedNotifications);
    }
  }, []);

  useEffect(() => {
    if (!notificationFeedback) return;

    const timeoutId = window.setTimeout(() => {
      setNotificationFeedback(false);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [notificationFeedback]);

  function updateAccountField<K extends keyof AccountForm>(
    key: K,
    value: AccountForm[K]
  ) {
    setAccountSuccess(false);
    setAccountError(null);
    setAccount((current) => ({ ...current, [key]: value }));
  }

  function updateCompanyField<K extends keyof CompanyForm>(
    key: K,
    value: CompanyForm[K]
  ) {
    setCompanySuccess(false);
    setCompanyError(null);
    setCompany((current) => ({ ...current, [key]: value }));
  }

  function updatePreferencesField<K extends keyof PreferencesForm>(
    key: K,
    value: PreferencesForm[K]
  ) {
    setPreferencesSuccess(false);
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function handleSaveAccount() {
    setAccountError(null);
    setAccountSuccess(false);

    const name = account.name.trim();
    const email = account.email.trim();
    const phone = account.phone.trim();

    if (!name) {
      setAccountError("Informe o nome.");
      return;
    }

    if (!email) {
      setAccountError("Informe o e-mail.");
      return;
    }

    if (!isValidEmail(email)) {
      setAccountError("Informe um e-mail válido.");
      return;
    }

    const next = { name, email, phone };
    setAccount(next);
    setSavedAccount(next);
    writeLocalStorageJson(STORAGE_KEYS.account, next);
    setAccountSuccess(true);
  }

  function handleSaveCompany() {
    setCompanyError(null);
    setCompanySuccess(false);

    const name = company.name.trim();
    const cnpj = company.cnpj.trim();
    const address = company.address.trim();
    const city = company.city.trim();
    const state = company.state;

    if (!name) {
      setCompanyError("Informe o nome da empresa.");
      return;
    }

    if (cnpj && !isBasicCnpjFormat(cnpj)) {
      setCompanyError("Informe um CNPJ válido.");
      return;
    }

    const next = { name, cnpj, address, city, state };
    setCompany(next);
    setSavedCompany(next);
    writeLocalStorageJson(STORAGE_KEYS.company, next);
    setCompanySuccess(true);
  }

  function handleSavePreferences() {
    setPreferencesSuccess(false);

    const next = {
      language: preferences.language,
      dateFormat: preferences.dateFormat,
      currency: preferences.currency,
      timezone: preferences.timezone,
    };

    setPreferences(next);
    setSavedPreferences(next);
    writeLocalStorageJson(STORAGE_KEYS.preferences, next);
    setPreferencesSuccess(true);
  }

  function toggleNotification(key: NotificationKey) {
    setNotifications((current) => {
      const next: NotificationsForm = {
        ...current,
        [key]: !current[key],
      };

      writeLocalStorageJson(STORAGE_KEYS.notifications, next);
      return next;
    });

    setNotificationFeedback(true);
  }

  function resetPasswordDialog() {
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordError(null);
    setPasswordSuccess(false);
  }

  function handlePasswordOpenChange(open: boolean) {
    setPasswordOpen(open);
    if (!open) resetPasswordDialog();
  }

  function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Preencha todos os campos.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("A confirmação deve ser igual à nova senha.");
      return;
    }

    setPasswordSuccess(true);
    setPasswordForm(EMPTY_PASSWORD_FORM);
  }

  function handleTwoFactorOpenChange(open: boolean) {
    setTwoFactorOpen(open);
    if (!open) setTwoFactorConfirmChecked(false);
  }

  function handleEnableTwoFactor() {
    if (!twoFactorConfirmChecked) return;
    setTwoFactorEnabled(true);
    setTwoFactorOpen(false);
    setTwoFactorConfirmChecked(false);
  }

  function handleDisableTwoFactor() {
    setTwoFactorEnabled(false);
    setDisableTwoFactorOpen(false);
  }

  function handleConfirmEndSession() {
    if (!sessionToEnd || sessionToEnd.current) return;
    setSessions((current) =>
      current.filter((session) => session.id !== sessionToEnd.id)
    );
    setSessionToEnd(null);
  }

  return (
    <div className="space-y-7">
      {/* Conta */}
      <Card className={SECTION_TONES.account.card}>
        <CardHeader className="space-y-0 pb-5">
          <SectionHeader
            icon={User}
            iconClassName={SECTION_TONES.account.icon}
            title="Conta"
            description="Dados pessoais do usuário logado no sistema"
          />
        </CardHeader>
        <CardContent className="space-y-5 pb-6">
          {accountSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Dados da conta salvos com sucesso.
            </div>
          ) : null}

          {accountError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {accountError}
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <SettingsField
              id="account-name"
              label="Nome"
              className="sm:col-span-2"
            >
              <Input
                id="account-name"
                className={fieldControlClassName}
                value={account.name}
                onChange={(event) =>
                  updateAccountField("name", event.target.value)
                }
              />
            </SettingsField>
            <SettingsField id="account-email" label="E-mail">
              <Input
                id="account-email"
                type="email"
                className={fieldControlClassName}
                value={account.email}
                onChange={(event) =>
                  updateAccountField("email", event.target.value)
                }
              />
            </SettingsField>
            <SettingsField id="account-phone" label="Telefone">
              <Input
                id="account-phone"
                className={fieldControlClassName}
                value={account.phone}
                onChange={(event) =>
                  updateAccountField("phone", event.target.value)
                }
              />
            </SettingsField>
          </div>
        </CardContent>
        <CardFooter
          className={cn(
            "justify-end border-t pt-5",
            SECTION_TONES.account.footer
          )}
        >
          <Button
            type="button"
            className={primaryButtonClassName}
            disabled={!accountDirty}
            onClick={handleSaveAccount}
          >
            Salvar conta
          </Button>
        </CardFooter>
      </Card>

      {/* Empresa */}
      <Card className={SECTION_TONES.company.card}>
        <CardHeader className="space-y-0 pb-5">
          <SectionHeader
            icon={Building2}
            iconClassName={SECTION_TONES.company.icon}
            title="Empresa"
            description="Informações cadastrais da empresa ativa"
          />
        </CardHeader>
        <CardContent className="space-y-5 pb-6">
          {companySuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Dados da empresa salvos com sucesso.
            </div>
          ) : null}

          {companyError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {companyError}
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <SettingsField
              id="company-name"
              label="Nome da empresa"
              className="sm:col-span-2"
            >
              <Input
                id="company-name"
                className={fieldControlClassName}
                value={company.name}
                onChange={(event) =>
                  updateCompanyField("name", event.target.value)
                }
              />
            </SettingsField>
            <SettingsField id="company-cnpj" label="CNPJ">
              <Input
                id="company-cnpj"
                className={fieldControlClassName}
                value={company.cnpj}
                onChange={(event) =>
                  updateCompanyField("cnpj", event.target.value)
                }
              />
            </SettingsField>
            <SettingsField
              id="company-address"
              label="Endereço"
              className="sm:col-span-2"
            >
              <Input
                id="company-address"
                className={fieldControlClassName}
                value={company.address}
                onChange={(event) =>
                  updateCompanyField("address", event.target.value)
                }
              />
            </SettingsField>
            <SettingsField id="company-city" label="Cidade">
              <Input
                id="company-city"
                className={fieldControlClassName}
                value={company.city}
                onChange={(event) =>
                  updateCompanyField("city", event.target.value)
                }
              />
            </SettingsField>
            <SettingsField id="company-state" label="Estado">
              <Select
                id="company-state"
                className={fieldControlClassName}
                value={company.state}
                onChange={(event) =>
                  updateCompanyField("state", event.target.value)
                }
              >
                {BRAZILIAN_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </Select>
            </SettingsField>
          </div>
        </CardContent>
        <CardFooter
          className={cn(
            "justify-end border-t pt-5",
            SECTION_TONES.company.footer
          )}
        >
          <Button
            type="button"
            className={primaryButtonClassName}
            disabled={!companyDirty}
            onClick={handleSaveCompany}
          >
            Salvar empresa
          </Button>
        </CardFooter>
      </Card>

      {/* Segurança */}
      <Card className={SECTION_TONES.security.card}>
        <CardHeader className="space-y-0 pb-5">
          <SectionHeader
            icon={Shield}
            iconClassName={SECTION_TONES.security.icon}
            title="Segurança"
            description="Proteção da conta, autenticação e sessões"
          />
        </CardHeader>
        <CardContent className="space-y-4 pb-2">
          <NestedPanel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <NestedIcon icon={KeyRound} />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--brand-navy)]">
                  Alterar senha
                </p>
                <p className="text-[13px] text-[var(--brand-navy)]/60">
                  Última alteração há 45 dias
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClassName}
              onClick={() => setPasswordOpen(true)}
            >
              Alterar senha
            </Button>
          </NestedPanel>

          <NestedPanel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <NestedIcon icon={Smartphone} />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--brand-navy)]">
                  Autenticação em duas etapas
                </p>
                <p className="text-[13px] text-[var(--brand-navy)]/60">
                  Adicione uma camada extra de proteção ao login
                </p>
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                    twoFactorEnabled
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
                      : "bg-amber-50 text-amber-900 ring-amber-600/20"
                  )}
                >
                  {twoFactorEnabled ? "Ativada" : "Desativada"}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClassName}
              onClick={() =>
                twoFactorEnabled
                  ? setDisableTwoFactorOpen(true)
                  : setTwoFactorOpen(true)
              }
            >
              {twoFactorEnabled ? "Desativar" : "Configurar"}
            </Button>
          </NestedPanel>

          <NestedPanel>
            <div className="mb-4 flex items-start gap-3">
              <NestedIcon icon={Monitor} />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--brand-navy)]">
                  Sessões ativas
                </p>
                <p className="text-[13px] text-[var(--brand-navy)]/60">
                  Dispositivos com acesso à sua conta
                </p>
              </div>
            </div>
            <Separator className="mb-4 bg-[var(--brand-navy)]/10" />
            <ul className="space-y-3.5">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[var(--brand-navy)]">
                      {session.device}
                      {session.current ? (
                        <span className="ml-2 inline-flex rounded-md bg-[var(--brand-navy)]/10 px-2 py-0.5 text-xs font-medium text-[var(--brand-navy)] ring-1 ring-inset ring-[var(--brand-navy)]/15">
                          Atual
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--brand-navy)]/55">
                      {session.location} · {session.lastActive}
                    </p>
                  </div>
                  {!session.current ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={ghostButtonClassName}
                      onClick={() => setSessionToEnd(session)}
                    >
                      Encerrar
                    </Button>
                  ) : null}
                </li>
              ))}
              {sessions.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Nenhuma sessão ativa no momento.
                </li>
              ) : null}
            </ul>
          </NestedPanel>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card className={SECTION_TONES.notifications.card}>
        <CardHeader className="space-y-0 pb-5">
          <SectionHeader
            icon={Bell}
            iconClassName={SECTION_TONES.notifications.icon}
            title="Notificações"
            description="Escolha como deseja receber avisos do sistema"
          />
        </CardHeader>
        <CardContent className="space-y-3.5 pb-2">
          {notificationFeedback ? (
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-4 py-2.5 text-[13px] text-emerald-800">
              Preferência de notificação atualizada.
            </div>
          ) : null}

          {(
            [
              {
                key: "email" as const,
                title: "E-mail",
                description: "Alertas e resumos enviados por e-mail",
              },
              {
                key: "system" as const,
                title: "Sistema",
                description: "Notificações internas no TR Control",
              },
              {
                key: "whatsapp" as const,
                title: "WhatsApp",
                description: "Avisos urgentes pelo WhatsApp",
                note: "A integração com WhatsApp será disponibilizada futuramente.",
              },
            ] as const
          ).map((item) => (
            <NestedPanel
              key={item.key}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-[var(--brand-navy)]">
                  {item.title}
                </p>
                <p className="text-[13px] text-[var(--brand-navy)]/60">
                  {item.description}
                </p>
                {"note" in item ? (
                  <p className="text-xs text-[var(--brand-navy)]/45">
                    {item.note}
                  </p>
                ) : null}
              </div>
              <ToggleSwitch
                checked={notifications[item.key]}
                onCheckedChange={() => toggleNotification(item.key)}
                label={item.title}
              />
            </NestedPanel>
          ))}
        </CardContent>
      </Card>

      {/* Preferências do sistema */}
      <Card className={SECTION_TONES.appearance.card}>
        <CardHeader className="space-y-0 pb-5">
          <SectionHeader
            icon={Settings2}
            iconClassName={SECTION_TONES.appearance.icon}
            title="Preferências do sistema"
            description="Idioma, datas, moeda e fuso horário da empresa"
          />
        </CardHeader>
        <CardContent className="space-y-5 pb-6">
          {preferencesSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Preferências salvas com sucesso.
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <SettingsField id="preferences-language" label="Idioma">
              <div className="relative">
                <Languages className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-[var(--brand-navy)]/45" />
                <Select
                  id="preferences-language"
                  className={cn(fieldControlClassName, "pl-9")}
                  value={preferences.language}
                  onChange={(event) =>
                    updatePreferencesField("language", event.target.value)
                  }
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </Select>
              </div>
            </SettingsField>
            <SettingsField id="preferences-date" label="Formato de data">
              <Select
                id="preferences-date"
                className={fieldControlClassName}
                value={preferences.dateFormat}
                onChange={(event) =>
                  updatePreferencesField("dateFormat", event.target.value)
                }
              >
                <option value="dd/MM/yyyy">DD/MM/AAAA</option>
                <option value="MM/dd/yyyy">MM/DD/AAAA</option>
                <option value="yyyy-MM-dd">AAAA-MM-DD</option>
              </Select>
            </SettingsField>
            <SettingsField id="preferences-currency" label="Moeda">
              <Select
                id="preferences-currency"
                className={fieldControlClassName}
                value={preferences.currency}
                onChange={(event) =>
                  updatePreferencesField("currency", event.target.value)
                }
              >
                <option value="BRL">Real (BRL)</option>
                <option value="USD">Dólar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </Select>
            </SettingsField>
            <SettingsField id="preferences-timezone" label="Fuso horário">
              <Select
                id="preferences-timezone"
                className={fieldControlClassName}
                value={preferences.timezone}
                onChange={(event) =>
                  updatePreferencesField("timezone", event.target.value)
                }
              >
                <option value="America/Sao_Paulo">
                  América/São Paulo (GMT-3)
                </option>
                <option value="America/Manaus">América/Manaus (GMT-4)</option>
                <option value="America/Noronha">
                  América/Noronha (GMT-2)
                </option>
                <option value="UTC">UTC</option>
              </Select>
            </SettingsField>
          </div>
        </CardContent>
        <CardFooter
          className={cn(
            "justify-end border-t pt-5",
            SECTION_TONES.appearance.footer
          )}
        >
          <Button
            type="button"
            className={primaryButtonClassName}
            disabled={!preferencesDirty}
            onClick={handleSavePreferences}
          >
            Salvar preferências
          </Button>
        </CardFooter>
      </Card>

      <Dialog
        open={passwordOpen}
        onOpenChange={handlePasswordOpenChange}
        title="Alterar senha"
        description="Simulação local — a senha real da conta não será alterada"
        className="max-w-md"
      >
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          {passwordSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Senha atualizada com sucesso (simulação local).
            </div>
          ) : null}

          {passwordError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {passwordError}
            </div>
          ) : null}

          <SettingsField id="current-password" label="Senha atual">
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              className={fieldControlClassName}
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  currentPassword: event.target.value,
                }))
              }
            />
          </SettingsField>

          <SettingsField id="new-password" label="Nova senha">
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className={fieldControlClassName}
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  newPassword: event.target.value,
                }))
              }
            />
          </SettingsField>

          <SettingsField id="confirm-password" label="Confirmar nova senha">
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className={fieldControlClassName}
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
            />
          </SettingsField>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handlePasswordOpenChange(false)}
            >
              {passwordSuccess ? "Fechar" : "Cancelar"}
            </Button>
            {!passwordSuccess ? (
              <Button type="submit" className={primaryButtonClassName}>
                Confirmar
              </Button>
            ) : null}
          </div>
        </form>
      </Dialog>

      <Dialog
        open={twoFactorOpen}
        onOpenChange={handleTwoFactorOpenChange}
        title="Ativar autenticação em duas etapas"
        description="Camada extra de proteção no acesso à conta"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ao ativar a autenticação em duas etapas, será solicitado um segundo
            fator além da senha no próximo login. Nesta etapa, a ativação é
            apenas visual e permanece no estado local da página.
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[var(--brand-coral)]"
              checked={twoFactorConfirmChecked}
              onChange={(event) =>
                setTwoFactorConfirmChecked(event.target.checked)
              }
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium text-[var(--brand-navy)]">
                Confirmo a ativação da autenticação em duas etapas
              </span>
              <span className="block text-[13px] text-muted-foreground">
                Entendo que esta é uma simulação local e não altera o login real.
              </span>
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleTwoFactorOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className={primaryButtonClassName}
              disabled={!twoFactorConfirmChecked}
              onClick={handleEnableTwoFactor}
            >
              Ativar
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={disableTwoFactorOpen}
        onOpenChange={setDisableTwoFactorOpen}
        title="Desativar autenticação em duas etapas"
        description="Confirme para voltar ao estado desativado"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Deseja desativar a autenticação em duas etapas? O status voltará
            para{" "}
            <span className="font-medium text-foreground">Desativada</span>{" "}
            apenas nesta simulação local.
          </p>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDisableTwoFactorOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDisableTwoFactor}
            >
              Desativar
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(sessionToEnd)}
        onOpenChange={(open) => {
          if (!open) setSessionToEnd(null);
        }}
        title="Encerrar sessão"
        description="A sessão será removida apenas da lista local"
        className="max-w-md"
      >
        {sessionToEnd ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza de que deseja encerrar esta sessão?
            </p>
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium text-[var(--brand-navy)]">
                {sessionToEnd.device}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {sessionToEnd.location} · {sessionToEnd.lastActive}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSessionToEnd(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmEndSession}
              >
                Encerrar sessão
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
