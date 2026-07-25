"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CompanyWithMembership, TenantContext } from "@/types";
import type { Company } from "@/types/database";
import type { CompanyRole } from "@/lib/constants";

type TenantProviderProps = {
  children: ReactNode;
  companies: CompanyWithMembership[];
  initialCompanyId?: string;
  loadError?: string | null;
};

type TenantContextValue = TenantContext & {
  companies: CompanyWithMembership[];
  loadError: string | null;
  setActiveCompany: (companyId: string) => void;
  updateCompany: (company: Company) => void;
};

const TenantContextInstance = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  children,
  companies,
  initialCompanyId,
  loadError = null,
}: TenantProviderProps) {
  const [companiesState, setCompaniesState] = useState(companies);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(
    initialCompanyId ?? companies[0]?.id ?? null
  );

  useEffect(() => {
    setCompaniesState(companies);

    setActiveCompanyId((currentId) => {
      if (currentId && companies.some((company) => company.id === currentId)) {
        return currentId;
      }

      return companies[0]?.id ?? null;
    });
  }, [companies]);

  const activeCompany = useMemo(
    () => companiesState.find((c) => c.id === activeCompanyId) ?? null,
    [companiesState, activeCompanyId]
  );

  const setActiveCompany = useCallback((companyId: string) => {
    setActiveCompanyId(companyId);
  }, []);

  const updateCompany = useCallback((company: Company) => {
    setCompaniesState((current) =>
      current.map((item) =>
        item.id === company.id
          ? {
              ...item,
              ...company,
              membership: item.membership,
            }
          : item
      )
    );
  }, []);

  const value = useMemo<TenantContextValue>(
    () => ({
      companies: companiesState,
      company: activeCompany,
      membership: activeCompany?.membership ?? null,
      role: (activeCompany?.membership.role as CompanyRole) ?? null,
      loadError,
      setActiveCompany,
      updateCompany,
    }),
    [companiesState, activeCompany, loadError, setActiveCompany, updateCompany]
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
