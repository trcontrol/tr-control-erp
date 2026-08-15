import {
  COMPANY_PLANS,
  COMPANY_STATUSES,
  type CompanyPlan,
  type CompanyStatus,
} from "@/lib/constants";

export const COMPANY_PLAN_OPTIONS: Array<{
  value: CompanyPlan;
  label: string;
}> = [
  { value: COMPANY_PLANS.essential, label: "Essencial" },
  { value: COMPANY_PLANS.professional, label: "Profissional" },
  { value: COMPANY_PLANS.premium, label: "Premium" },
];

export const COMPANY_STATUS_OPTIONS: Array<{
  value: CompanyStatus;
  label: string;
}> = [
  { value: COMPANY_STATUSES.active, label: "Ativa" },
  { value: COMPANY_STATUSES.suspended, label: "Suspensa" },
];

export function companyPlanLabel(plan: string): string {
  return (
    COMPANY_PLAN_OPTIONS.find((option) => option.value === plan)?.label ?? plan
  );
}

export function companyStatusLabel(status: string): string {
  return (
    COMPANY_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

export function slugifyCompanyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type AdminCompanyListItem = {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  plan: string;
  status: string;
  createdAt: string;
  pendingInitialOwnerInviteId: string | null;
  pendingInitialOwnerEmail: string | null;
};

export type CreateCompanyWithOwnerInput = {
  name: string;
  legalName?: string;
  slug: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  plan: CompanyPlan;
  status?: CompanyStatus;
  ownerFullName: string;
  ownerEmail: string;
};

export type CreateCompanyWithOwnerResult = {
  companyId: string;
  inviteId: string;
  emailSent: boolean;
  emailError: string | null;
  message: string;
};

/** Payload estrito — somente plan/status (Super Admin). */
export type UpdateCompanyCommercialInput = {
  companyId: string;
  plan: CompanyPlan;
  status: CompanyStatus;
};

export type UpdateCompanyCommercialResult = {
  companyId: string;
  plan: CompanyPlan;
  status: CompanyStatus;
  message: string;
};
