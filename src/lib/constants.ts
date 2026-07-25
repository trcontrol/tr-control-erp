export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "TR Control ERP";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  companies: "/companies",
  customers: "/customers",
  customersNew: "/customers/new",
  authCallback: "/api/auth/callback",
} as const;

export function customerDetailPath(id: string) {
  return `/customers/${id}`;
}

export function customerEditPath(id: string) {
  return `/customers/${id}/edit`;
}

export const PERSON_TYPES = {
  individual: "individual",
  company: "company",
} as const;

export type PersonType = (typeof PERSON_TYPES)[keyof typeof PERSON_TYPES];

export const PERSON_TYPE_OPTIONS = [
  { value: PERSON_TYPES.individual, label: "Pessoa física" },
  { value: PERSON_TYPES.company, label: "Pessoa jurídica" },
] as const;

export const CUSTOMER_STATUS = {
  active: "active",
  inactive: "inactive",
} as const;

export type CustomerStatus =
  (typeof CUSTOMER_STATUS)[keyof typeof CUSTOMER_STATUS];

export const CUSTOMER_STATUS_OPTIONS = [
  { value: CUSTOMER_STATUS.active, label: "Ativo" },
  { value: CUSTOMER_STATUS.inactive, label: "Inativo" },
] as const;

export const COMPANY_ROLES = {
  owner: "owner",
  admin: "admin",
  member: "member",
} as const;

export type CompanyRole =
  (typeof COMPANY_ROLES)[keyof typeof COMPANY_ROLES];

export const COMPANY_PLANS = {
  free: "free",
  starter: "starter",
  business: "business",
  enterprise: "enterprise",
} as const;

export type CompanyPlan =
  (typeof COMPANY_PLANS)[keyof typeof COMPANY_PLANS];

export const COMPANY_LOGOS_BUCKET = "company-logos";

export const TAX_REGIMES = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
  { value: "mei", label: "MEI" },
  { value: "isento", label: "Isento" },
] as const;

export type TaxRegime = (typeof TAX_REGIMES)[number]["value"];

export const BRAZILIAN_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
] as const;
