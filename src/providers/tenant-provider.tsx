"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CompanyWithMembership, TenantContext } from "@/types";
import type { CompanyRole } from "@/lib/constants";

type TenantProviderProps = {
  children: ReactNode;
  companies: CompanyWithMembership[];
  initialCompanyId?: string;
};

type TenantContextValue = TenantContext & {
  companies: CompanyWithMembership[];
  setActiveCompany: (companyId: string) => void;
};

const TenantContextInstance = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  children,
  companies,
  initialCompanyId,
}: TenantProviderProps) {
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(
    initialCompanyId ?? companies[0]?.id ?? null
  );

  const activeCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId) ?? null,
    [companies, activeCompanyId]
  );

  const setActiveCompany = useCallback((companyId: string) => {
    setActiveCompanyId(companyId);
  }, []);

  const value = useMemo<TenantContextValue>(
    () => ({
      companies,
      company: activeCompany,
      membership: activeCompany?.membership ?? null,
      role: (activeCompany?.membership.role as CompanyRole) ?? null,
      setActiveCompany,
    }),
    [companies, activeCompany, setActiveCompany]
  );

  return (
    <TenantContextInstance.Provider value={value}>
      {children}
    </TenantContextInstance.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContextInstance);

  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }

  return context;
}
