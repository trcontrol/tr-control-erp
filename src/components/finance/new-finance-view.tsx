"use client";

import { useSearchParams } from "next/navigation";
import { FinanceForm } from "@/components/finance/finance-form";
import { FinancePageShell } from "@/components/finance/finance-page-shell";
import {
  FINANCIAL_ENTRY_TYPES,
  type FinancialEntryType,
} from "@/lib/constants";

export function NewFinanceView() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const defaultType: FinancialEntryType =
    typeParam === FINANCIAL_ENTRY_TYPES.receivable
      ? FINANCIAL_ENTRY_TYPES.receivable
      : FINANCIAL_ENTRY_TYPES.payable;

  return (
    <FinancePageShell
      title="Novo lançamento"
      description="Cadastre uma conta a pagar ou a receber"
    >
      <FinanceForm mode="create" defaultType={defaultType} />
    </FinancePageShell>
  );
}
