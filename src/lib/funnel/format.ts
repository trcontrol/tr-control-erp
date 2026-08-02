import {
  OPPORTUNITY_STAGE_OPTIONS,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_STATUS_OPTIONS,
} from "@/lib/constants";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function opportunityStageLabel(stage: string) {
  return (
    OPPORTUNITY_STAGE_OPTIONS.find((item) => item.value === stage)?.label ??
    stage
  );
}

export function opportunityStatusLabel(status: string) {
  return (
    OPPORTUNITY_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

export function formatOpportunityCurrency(
  value: number | string | null | undefined
) {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function parseOpportunityCurrencyInput(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : NaN;
}

export function formatOpportunityCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const amount = Number(digits) / 100;
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toOpportunityAmount(value: number | string) {
  const amount = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(amount) ? amount : 0;
}

export function formatOpportunityDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

export function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TERMINAL_STAGES = new Set<string>([
  OPPORTUNITY_STAGES.contract_closed,
  OPPORTUNITY_STAGES.project_in_progress,
  OPPORTUNITY_STAGES.completed,
  OPPORTUNITY_STAGES.lost,
]);

export function isNextActionOverdue(params: {
  nextActionDate?: string | null;
  stage: string;
  status: string;
  today?: string;
}) {
  if (!params.nextActionDate) return false;
  if (params.status !== "active") return false;
  if (TERMINAL_STAGES.has(params.stage)) {
    return false;
  }
  const today = params.today ?? todayDateString();
  return params.nextActionDate < today;
}

/** Cores oficiais das etapas (bolinha / barra do card). */
export function opportunityStageAccent(stage: string) {
  switch (stage) {
    case OPPORTUNITY_STAGES.new_lead:
      return {
        bar: "bg-[#0a1628]",
        soft: "bg-[#0a1628]/8",
        text: "text-[#0a1628]",
        ring: "ring-[#0a1628]/15",
      };
    case OPPORTUNITY_STAGES.contact_made:
      return {
        bar: "bg-[#1e4a7a]",
        soft: "bg-[#1e4a7a]/10",
        text: "text-[#1e4a7a]",
        ring: "ring-[#1e4a7a]/20",
      };
    case OPPORTUNITY_STAGES.briefing_sent:
      return {
        bar: "bg-[#d9487a]",
        soft: "bg-[#d9487a]/12",
        text: "text-[#d9487a]",
        ring: "ring-[#d9487a]/25",
      };
    case OPPORTUNITY_STAGES.proposal_sent:
      return {
        bar: "bg-[#f0b8c8]",
        soft: "bg-[#f0b8c8]/35",
        text: "text-[#9a4a62]",
        ring: "ring-[#f0b8c8]/50",
      };
    case OPPORTUNITY_STAGES.negotiation:
      return {
        bar: "bg-[var(--brand-gold)]",
        soft: "bg-[var(--brand-gold)]/15",
        text: "text-[var(--brand-navy)]",
        ring: "ring-[var(--brand-gold)]/30",
      };
    case OPPORTUNITY_STAGES.contract_closed:
      return {
        bar: "bg-[#d4bc6a]",
        soft: "bg-[#d4bc6a]/18",
        text: "text-[var(--brand-navy)]",
        ring: "ring-[#d4bc6a]/35",
      };
    case OPPORTUNITY_STAGES.project_in_progress:
      return {
        bar: "bg-[#c4b8a8]",
        soft: "bg-[#c4b8a8]/25",
        text: "text-[#6b6358]",
        ring: "ring-[#c4b8a8]/40",
      };
    case OPPORTUNITY_STAGES.completed:
      return {
        bar: "bg-[#9ca3af]",
        soft: "bg-[#9ca3af]/20",
        text: "text-[#4b5563]",
        ring: "ring-[#9ca3af]/35",
      };
    case OPPORTUNITY_STAGES.lost:
      return {
        bar: "bg-slate-400",
        soft: "bg-slate-100",
        text: "text-slate-600",
        ring: "ring-slate-200",
      };
    default:
      return {
        bar: "bg-[var(--brand-navy)]",
        soft: "bg-[var(--brand-surface-soft)]",
        text: "text-[var(--brand-navy)]",
        ring: "ring-[var(--brand-navy)]/10",
      };
  }
}

export function customerDisplayName(customer: {
  full_name: string;
  trade_name?: string | null;
} | null) {
  if (!customer) return "—";
  return customer.trade_name?.trim() || customer.full_name;
}
