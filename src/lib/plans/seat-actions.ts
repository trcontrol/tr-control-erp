"use server";

import { getCompanySeatUsage } from "@/lib/plans/seats";
import type { SeatUsageSnapshot } from "@/lib/plans/limits";

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } };

export async function getCompanySeatUsageAction(
  companyId: string
): Promise<Result<SeatUsageSnapshot>> {
  const result = await getCompanySeatUsage({ companyId });
  if ("error" in result) {
    return { data: null, error: { message: result.error } };
  }
  return { data: result, error: null };
}
