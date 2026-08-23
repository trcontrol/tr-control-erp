"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CompanyWithMembership, TenantContext } from "@/types";
import type { Company } from "@/types/database";
import type { CompanyRole } from "@/lib/constants";
import { persistActiveCompanyAction } from "@/lib/auth/active-company-actions";
import { resolveActiveCompanyId } from "@/lib/auth/active-company";
import { getMemberAccessAction } from "@/lib/plans/access-actions";
import type { PermissionModuleId } from "@/lib/users/permissions";

type TenantProviderProps = {
  children: ReactNode;
  companies: CompanyWithMembership[];
  initialCompanyId?: string;
  /** Teto comercial efetivo (plan ⊕ overrides) da empresa inicial */
  initialEntitledModules?: PermissionModuleId[];
  /** Módulos efetivos view (teto ∩ permissão) da empresa inicial */
  initialAllowedModules?: PermissionModuleId[];
  /** Módulos com create efetivo */
  initialCreatableModules?: PermissionModuleId[];
  initialEditableModules?: PermissionModuleId[];
  initialDeletableModules?: PermissionModuleId[];
  loadError?: string | null;
};

type TenantContextValue = TenantContext & {
  companies: CompanyWithMembership[];
  loadError: string | null;
  /** Teto comercial da empresa ativa (plan ⊕ overrides) — gestão de usuários */
  entitledModules: PermissionModuleId[];
  /** Módulos que a sidebar/guards consideram acessíveis na empresa ativa */
  allowedModules: PermissionModuleId[];
  /** Módulos em que o usuário pode criar (atalhos / botões Novo) */
  creatableModules: PermissionModuleId[];
  editableModules: PermissionModuleId[];
  deletableModules: PermissionModuleId[];
  setActiveCompany: (companyId: string) => void;
  updateCompany: (company: Company) => void;
  /**
   * Reconsulta o snapshot de acesso do auth.uid() na empresa ativa (ou forCompanyId).
   * Não troca a empresa. Não aplica matriz de formulário.
   */
  refreshAccessSnapshot: (forCompanyId?: string) => Promise<void>;
};

const TenantContextInstance = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  children,
  companies,
  initialCompanyId,
  initialEntitledModules = [],
  initialAllowedModules = [],
  initialCreatableModules = [],
  initialEditableModules = [],
  initialDeletableModules = [],
  loadError = null,
}: TenantProviderProps) {
  const [companiesState, setCompaniesState] = useState(companies);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(() =>
    resolveActiveCompanyId(
      companies.map((company) => company.id),
      initialCompanyId
    )
  );
  const [entitledModules, setEntitledModules] = useState<PermissionModuleId[]>(
    initialEntitledModules
  );
  const [allowedModules, setAllowedModules] =
    useState<PermissionModuleId[]>(initialAllowedModules);
  const [creatableModules, setCreatableModules] = useState<
    PermissionModuleId[]
  >(initialCreatableModules);
  const [editableModules, setEditableModules] = useState<PermissionModuleId[]>(
    initialEditableModules
  );
  const [deletableModules, setDeletableModules] = useState<
    PermissionModuleId[]
  >(initialDeletableModules);

  const activeCompanyIdRef = useRef(activeCompanyId);
  activeCompanyIdRef.current = activeCompanyId;

  useEffect(() => {
    setCompaniesState(companies);
    setActiveCompanyId((currentId) =>
      resolveActiveCompanyId(
        companies.map((company) => company.id),
        currentId ?? initialCompanyId
      )
    );
  }, [companies, initialCompanyId]);

  useEffect(() => {
    setEntitledModules(initialEntitledModules);
  }, [initialEntitledModules]);

  useEffect(() => {
    setAllowedModules(initialAllowedModules);
  }, [initialAllowedModules]);

  useEffect(() => {
    setCreatableModules(initialCreatableModules);
  }, [initialCreatableModules]);

  useEffect(() => {
    setEditableModules(initialEditableModules);
  }, [initialEditableModules]);

  useEffect(() => {
    setDeletableModules(initialDeletableModules);
  }, [initialDeletableModules]);

  const activeCompany = useMemo(
    () => companiesState.find((c) => c.id === activeCompanyId) ?? null,
    [companiesState, activeCompanyId]
  );

  const applyAccessSnapshot = useCallback(
    (
      companyId: string,
      access: Awaited<ReturnType<typeof getMemberAccessAction>>
    ) => {
      if (activeCompanyIdRef.current !== companyId) return;
      setEntitledModules(access?.entitledModules ?? []);
      setAllowedModules(access?.allowedModules ?? []);
      setCreatableModules(access?.creatableModules ?? []);
      setEditableModules(access?.editableModules ?? []);
      setDeletableModules(access?.deletableModules ?? []);
    },
    []
  );

  const setActiveCompany = useCallback(
    (companyId: string) => {
      setActiveCompanyId(companyId);
      void persistActiveCompanyAction(companyId);
      void getMemberAccessAction(companyId).then((access) => {
        applyAccessSnapshot(companyId, access);
      });
    },
    [applyAccessSnapshot]
  );

  const refreshAccessSnapshot = useCallback(
    async (forCompanyId?: string) => {
      const companyId = forCompanyId ?? activeCompanyIdRef.current;
      if (!companyId) return;
      const access = await getMemberAccessAction(companyId);
      applyAccessSnapshot(companyId, access);
    },
    [applyAccessSnapshot]
  );

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
      entitledModules,
      allowedModules,
      creatableModules,
      editableModules,
      deletableModules,
      setActiveCompany,
      updateCompany,
      refreshAccessSnapshot,
    }),
    [
      companiesState,
      activeCompany,
      loadError,
      entitledModules,
      allowedModules,
      creatableModules,
      editableModules,
      deletableModules,
      setActiveCompany,
      updateCompany,
      refreshAccessSnapshot,
    ]
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
