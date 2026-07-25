import type { Company, CompanyMember, Profile } from "@/types/database";
import type { CompanyRole } from "@/lib/constants";

export type CompanyWithMembership = Company & {
  membership: CompanyMember;
};

export type UserProfile = Profile & {
  email?: string;
};

export type TenantContext = {
  company: CompanyWithMembership | null;
  membership: CompanyMember | null;
  role: CompanyRole | null;
};

export type AuthSession = {
  user: {
    id: string;
    email?: string;
  } | null;
};
