/**
 * QA filtros de período do card de recebíveis.
 * Uso: npx --yes tsx scripts/qa-upcoming-receivables.ts
 */
import { FINANCIAL_ENTRY_TYPES, FINANCIAL_STATUS } from "../src/lib/constants";
import type { FinancialEntryWithRelations } from "../src/lib/finance/entry-query";
import {
  UPCOMING_RECEIVABLES_DEFAULT_WINDOW,
  UPCOMING_RECEIVABLES_PREVIEW_LIMIT,
  addDaysISO,
  filterUpcomingReceivables,
  sumEntryAmounts,
  upcomingReceivablesPeriod,
  type UpcomingReceivablesWindow,
} from "../src/lib/finance/upcoming";

function pass(name: string) {
  console.log(`PASS  ${name}`);
}

function fail(name: string, detail: string): never {
  console.error(`FAIL  ${name}: ${detail}`);
  process.exit(1);
}

const asOf = "2026-08-21";

if (UPCOMING_RECEIVABLES_DEFAULT_WINDOW !== 30) {
  fail("default", String(UPCOMING_RECEIVABLES_DEFAULT_WINDOW));
}
pass("Default window = 30");

function assertPeriod(
  window: UpcomingReceivablesWindow,
  from: string,
  to?: string
) {
  const period = upcomingReceivablesPeriod(window, asOf);
  if (period.periodFrom !== from) fail(String(window), `from ${period.periodFrom}`);
  if (to === undefined) {
    if (period.periodTo !== undefined) fail(String(window), "periodTo should be absent");
  } else if (period.periodTo !== to) {
    fail(String(window), `to ${period.periodTo}`);
  }
}

assertPeriod(7, "2026-08-21", "2026-08-28");
pass("7 dias");
assertPeriod(15, "2026-08-21", "2026-09-05");
pass("15 dias");
assertPeriod(30, "2026-08-21", "2026-09-20");
pass("30 dias");
assertPeriod(60, "2026-08-21", "2026-10-20");
pass("60 dias");
assertPeriod("all", "2026-08-21", undefined);
pass("Todos (sem periodTo)");

function entry(
  patch: Partial<FinancialEntryWithRelations> & {
    id: string;
    due_date: string;
    status: string;
    amount: number;
  }
): FinancialEntryWithRelations {
  return {
    company_id: "c1",
    entry_type: FINANCIAL_ENTRY_TYPES.receivable,
    description: "Test",
    category: null,
    party_name: "Maicon",
    customer_id: null,
    supplier_id: null,
    issue_date: asOf,
    payment_date: null,
    payment_method: null,
    document_number: null,
    notes: null,
    is_recurring: false,
    source_type: "sale",
    source_id: null,
    bank_account_id: null,
    is_reconciled: false,
    reconciled_at: null,
    installment_number: null,
    installment_count: null,
    created_at: asOf,
    updated_at: asOf,
    customer: null,
    supplier: null,
    ...patch,
  } as FinancialEntryWithRelations;
}

const sample = [
  entry({ id: "d0", due_date: "2026-08-21", status: FINANCIAL_STATUS.pending, amount: 100 }),
  entry({ id: "d8", due_date: "2026-08-29", status: FINANCIAL_STATUS.pending, amount: 50 }),
  entry({ id: "d20", due_date: "2026-09-10", status: FINANCIAL_STATUS.pending, amount: 70 }),
  entry({ id: "d40", due_date: "2026-09-30", status: FINANCIAL_STATUS.pending, amount: 80 }),
  entry({ id: "d70", due_date: "2026-10-30", status: FINANCIAL_STATUS.pending, amount: 90 }),
  entry({ id: "over", due_date: "2026-08-10", status: FINANCIAL_STATUS.overdue, amount: 999 }),
  entry({ id: "recv", due_date: "2026-08-22", status: FINANCIAL_STATUS.received, amount: 11 }),
  entry({ id: "canc", due_date: "2026-08-22", status: FINANCIAL_STATUS.cancelled, amount: 12 }),
];

function inPeriod(window: UpcomingReceivablesWindow) {
  const { periodFrom, periodTo } = upcomingReceivablesPeriod(window, asOf);
  return sample.filter((e) => {
    if (e.due_date < periodFrom) return false;
    if (periodTo && e.due_date > periodTo) return false;
    return true;
  });
}

function runWindow(window: UpcomingReceivablesWindow) {
  return filterUpcomingReceivables(inPeriod(window), asOf);
}

const w7 = runWindow(7);
if (w7.map((e) => e.id).join(",") !== "d0") fail("lista 7", w7.map((e) => e.id).join(","));
if (sumEntryAmounts(w7) !== 100) fail("total 7", String(sumEntryAmounts(w7)));
pass("Lista/total 7 dias");

const w15 = runWindow(15);
if (w15.map((e) => e.id).join(",") !== "d0,d8") fail("lista 15", w15.map((e) => e.id).join(","));
if (sumEntryAmounts(w15) !== 150) fail("total 15", String(sumEntryAmounts(w15)));
pass("Lista/total 15 dias");

const w30 = runWindow(30);
if (w30.map((e) => e.id).join(",") !== "d0,d8,d20") {
  fail("lista 30", w30.map((e) => e.id).join(","));
}
if (sumEntryAmounts(w30) !== 220) fail("total 30", String(sumEntryAmounts(w30)));
pass("Lista/total 30 dias");

const w60 = runWindow(60);
if (w60.map((e) => e.id).join(",") !== "d0,d8,d20,d40") {
  fail("lista 60", w60.map((e) => e.id).join(","));
}
if (sumEntryAmounts(w60) !== 300) fail("total 60", String(sumEntryAmounts(w60)));
pass("Lista/total 60 dias");

const wall = runWindow("all");
if (wall.map((e) => e.id).join(",") !== "d0,d8,d20,d40,d70") {
  fail("lista all", wall.map((e) => e.id).join(","));
}
if (sumEntryAmounts(wall) !== 390) fail("total all", String(sumEntryAmounts(wall)));
pass("Lista/total Todos (inclui futuro além de 60; exclui vencido)");

if (wall.some((e) => e.id === "over" || e.id === "recv" || e.id === "canc")) {
  fail("excluir", "vencido/recebido/cancelado vazou");
}
pass("Recebidos/cancelados/vencidos não aparecem");

const many = Array.from({ length: 7 }, (_, i) =>
  entry({
    id: `m${i}`,
    due_date: addDaysISO(asOf, i),
    status: FINANCIAL_STATUS.pending,
    amount: 10,
  })
);
const filtered = filterUpcomingReceivables(many, asOf);
if (filtered.slice(0, UPCOMING_RECEIVABLES_PREVIEW_LIMIT).length !== 5) {
  fail("preview", String(filtered.length));
}
pass(`Máximo ${UPCOMING_RECEIVABLES_PREVIEW_LIMIT} no preview`);
pass("Ordenação due_date ASC");

console.log("\nQA upcoming window filters: OK");
