"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompanyForm } from "@/components/companies/company-form";
import { useTenant } from "@/providers/tenant-provider";
import type { CompanyWithMembership } from "@/types";

type CompaniesViewProps = {
  companies: CompanyWithMembership[];
  loadError?: string | null;
};

export function CompaniesView({
  companies,
  loadError = null,
}: CompaniesViewProps) {
  const { company, loadError: tenantLoadError } = useTenant();
  const activeCompany = company ?? companies[0] ?? null;
  const visibleError = loadError ?? tenantLoadError;

  if (!activeCompany) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma empresa encontrada</CardTitle>
          <CardDescription>
            {visibleError
              ? visibleError
              : "Crie uma empresa ao se cadastrar ou peça um convite a um administrador."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{activeCompany.name}</CardTitle>
            <CardDescription>
              {activeCompany.legal_name || "Complete a razão social"}
              {activeCompany.cnpj ? ` · ${activeCompany.cnpj}` : ""}
            </CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            Papel:{" "}
            <span className="font-medium capitalize text-foreground">
              {activeCompany.membership.role}
            </span>
          </div>
        </CardHeader>
      </Card>

      <CompanyForm key={activeCompany.id} company={activeCompany} />
    </div>
  );
}
