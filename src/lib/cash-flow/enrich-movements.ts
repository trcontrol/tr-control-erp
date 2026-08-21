import type { CashFlowDashboard } from "@/types/database";

type Movement = CashFlowDashboard["movements"][number];

type InstallmentRow = {
  id: string;
  installment_number: number | null;
  installment_count: number | null;
};

/**
 * Enrich movements with installment_* from financial_entries.
 * Merge key: movement.id === financial_entries.id (já retornado pela RPC).
 * Uma única query .in("id", ids) — sem N+1.
 */
export async function enrichCashFlowMovementsWithInstallments(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any };
  companyId: string;
  movements: Movement[];
}): Promise<Movement[]> {
  const { supabase, companyId, movements } = params;
  if (movements.length === 0) return movements;

  const ids = Array.from(
    new Set(movements.map((row) => row.id).filter(Boolean))
  );
  if (ids.length === 0) return movements;

  const { data, error } = await supabase
    .from("financial_entries")
    .select("id, installment_number, installment_count")
    .eq("company_id", companyId)
    .in("id", ids);

  if (error || !data) {
    return movements;
  }

  const byId = new Map<string, InstallmentRow>();
  for (const row of data as InstallmentRow[]) {
    byId.set(row.id, row);
  }

  return movements.map((movement) => {
    const meta = byId.get(movement.id);
    if (!meta) {
      return {
        ...movement,
        installment_number: null,
        installment_count: null,
      };
    }
    return {
      ...movement,
      installment_number: meta.installment_number,
      installment_count: meta.installment_count,
    };
  });
}
