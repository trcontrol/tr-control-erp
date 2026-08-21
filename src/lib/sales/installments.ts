/**
 * Helpers de parcelamento de vendas (plano draft → sale_payment_schedules).
 *
 * Regra de datas (âncora mensal):
 *   dia = min(dia original da 1ª parcela, último dia do mês alvo)
 *
 * Exemplos (âncora = 31):
 *   31/01 → 28/02 (ou 29 em bissexto) → 31/03 → 30/04
 *
 * Split de centavos:
 *   resto dos centavos vai para as primeiras parcelas.
 *   R$ 100,00 / 3 → 33,34 + 33,33 + 33,33
 */

export const PAYMENT_CONDITIONS = {
  cash: "cash",
  installment: "installment",
} as const;

export type PaymentCondition =
  (typeof PAYMENT_CONDITIONS)[keyof typeof PAYMENT_CONDITIONS];

export const PAYMENT_CONDITION_OPTIONS = [
  { value: PAYMENT_CONDITIONS.cash, label: "À vista" },
  { value: PAYMENT_CONDITIONS.installment, label: "Parcelado" },
] as const;

export type InstallmentScheduleRow = {
  installment_number: number;
  installment_count: number;
  due_date: string;
  amount: number;
  payment_method: string | null;
};

/** Converte valor monetário (2 casas) para centavos inteiros. */
export function amountToCents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

export function centsToAmount(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

/**
 * Divide o total em N parcelas com soma exata em centavos.
 * O resto fica nas primeiras parcelas (+1 centavo cada).
 */
export function splitAmountEvenly(total: number, count: number): number[] {
  if (!Number.isFinite(total) || !Number.isFinite(count) || count < 1) {
    return [];
  }

  const totalCents = amountToCents(total);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;

  return Array.from({ length: count }, (_, index) =>
    centsToAmount(base + (index < remainder ? 1 : 0))
  );
}

/** Último dia do mês (month 1–12). */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Soma `monthsToAdd` meses a uma data ISO (YYYY-MM-DD),
 * clampeando o dia pela âncora original.
 */
export function addMonthsClamped(
  isoDate: string,
  monthsToAdd: number,
  anchorDay?: number
): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;

  const day = anchorDay ?? d;
  const totalMonths = y * 12 + (m - 1) + monthsToAdd;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  const clampedDay = Math.min(day, lastDayOfMonth(year, month));

  return `${year}-${String(month).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

export function generateInstallmentSchedule(params: {
  totalAmount: number;
  installmentCount: number;
  firstDueDate: string;
  paymentMethod?: string | null;
}): InstallmentScheduleRow[] {
  const { totalAmount, installmentCount, firstDueDate, paymentMethod } = params;
  if (installmentCount < 2 || !firstDueDate) return [];

  const amounts = splitAmountEvenly(totalAmount, installmentCount);
  const [, , day] = firstDueDate.split("-").map(Number);
  const anchorDay = day;

  return amounts.map((amount, index) => ({
    installment_number: index + 1,
    installment_count: installmentCount,
    due_date:
      index === 0
        ? firstDueDate
        : addMonthsClamped(firstDueDate, index, anchorDay),
    amount,
    payment_method: paymentMethod || null,
  }));
}

export function sumScheduleAmounts(
  rows: Pick<InstallmentScheduleRow, "amount">[]
): number {
  const cents = rows.reduce(
    (sum, row) => sum + amountToCents(Number(row.amount) || 0),
    0
  );
  return centsToAmount(cents);
}

export function scheduleDifference(
  saleTotal: number,
  rows: Pick<InstallmentScheduleRow, "amount">[]
): number {
  return centsToAmount(
    amountToCents(saleTotal) - amountToCents(sumScheduleAmounts(rows))
  );
}

/**
 * Validação amigável alinhada à RPC confirm_sale (installment).
 * Retorna mensagem ou null se ok.
 */
export function validateInstallmentSchedule(params: {
  saleTotal: number;
  rows: InstallmentScheduleRow[];
}): string | null {
  const { saleTotal, rows } = params;
  const count = rows.length;

  if (count < 2) {
    return "Venda parcelada exige no mínimo 2 parcelas.";
  }

  const numbers = rows.map((row) => row.installment_number);
  const distinctNumbers = new Set(numbers);
  if (distinctNumbers.size !== count) {
    return "Há parcelas com numeração duplicada.";
  }

  const counts = new Set(rows.map((row) => row.installment_count));
  if (counts.size !== 1) {
    return "Todas as parcelas devem ter o mesmo total de parcelas.";
  }

  const installmentCount = rows[0]?.installment_count ?? 0;
  if (installmentCount !== count) {
    return `O total de parcelas (${installmentCount}) deve ser igual à quantidade informada (${count}).`;
  }

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  if (min !== 1 || max !== count) {
    return `Os números das parcelas devem formar a sequência contínua 1..${count}.`;
  }

  for (const row of rows) {
    if (!row.due_date) {
      return "Todas as parcelas devem possuir data de vencimento.";
    }
    if (!Number.isFinite(row.amount) || row.amount <= 0) {
      return "O valor de cada parcela deve ser maior que zero.";
    }
  }

  const diff = scheduleDifference(saleTotal, rows);
  if (diff !== 0) {
    return `A soma das parcelas deve ser igual ao total da venda (diferença: ${diff.toFixed(2)}).`;
  }

  return null;
}

export function paymentConditionLabel(value?: string | null) {
  if (!value) return "—";
  return (
    PAYMENT_CONDITION_OPTIONS.find((item) => item.value === value)?.label ??
    value
  );
}

/**
 * Autoteste leve das regras documentadas (chamado pelo script de QA).
 * Lança Error se alguma asserção falhar.
 */
export function assertInstallmentHelpers() {
  const centsSplit = splitAmountEvenly(100, 3);
  if (centsSplit.map((v) => v.toFixed(2)).join(",") !== "33.34,33.33,33.33") {
    throw new Error(`Split centavos falhou: ${centsSplit.join(",")}`);
  }

  const equal = splitAmountEvenly(900, 3);
  if (equal.map((v) => v.toFixed(2)).join(",") !== "300.00,300.00,300.00") {
    throw new Error(`Split iguais falhou: ${equal.join(",")}`);
  }

  const jan31 = "2026-01-31";
  const feb = addMonthsClamped(jan31, 1, 31);
  const mar = addMonthsClamped(jan31, 2, 31);
  const apr = addMonthsClamped(jan31, 3, 31);
  if (feb !== "2026-02-28" || mar !== "2026-03-31" || apr !== "2026-04-30") {
    throw new Error(`Âncora fim de mês falhou: ${feb}, ${mar}, ${apr}`);
  }

  const schedule = generateInstallmentSchedule({
    totalAmount: 900,
    installmentCount: 3,
    firstDueDate: "2026-09-10",
    paymentMethod: "pix",
  });
  if (
    schedule.map((r) => r.due_date).join(",") !==
    "2026-09-10,2026-10-10,2026-11-10"
  ) {
    throw new Error("Datas mensais falharam");
  }

  const err = validateInstallmentSchedule({
    saleTotal: 100,
    rows: generateInstallmentSchedule({
      totalAmount: 100,
      installmentCount: 3,
      firstDueDate: "2026-09-10",
    }),
  });
  if (err) throw new Error(`Validação deveria passar: ${err}`);
}
