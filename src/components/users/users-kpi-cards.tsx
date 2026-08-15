"use client";

import { Clock3, UserCheck, UserX, Users } from "lucide-react";
import type { CompanyUserKpis } from "@/lib/users/actions";
import { cn } from "@/lib/utils";

const KPI_META = [
  {
    key: "total" as const,
    title: "Total de usuários",
    hint: "Vinculados à empresa ativa",
    icon: Users,
    tone: "navy" as const,
  },
  {
    key: "active" as const,
    title: "Usuários ativos",
    hint: "Com acesso liberado",
    icon: UserCheck,
    tone: "gold" as const,
  },
  {
    key: "inactive" as const,
    title: "Usuários inativos",
    hint: "Acesso suspenso",
    icon: UserX,
    tone: "coral" as const,
  },
  {
    key: "pending" as const,
    title: "Convites pendentes",
    hint: "Aguardando confirmação (reservam vaga)",
    icon: Clock3,
    tone: "soft" as const,
  },
];

const TONE_STYLES = {
  navy: {
    card: "border-[var(--brand-navy)]/10 bg-gradient-to-br from-white to-[var(--brand-navy)]/[0.04]",
    icon: "bg-[var(--brand-navy)]/10 text-[var(--brand-navy)] ring-[var(--brand-navy)]/15",
    value: "text-[var(--brand-navy)]",
    bar: "bg-[var(--brand-navy)]",
  },
  gold: {
    card: "border-[var(--brand-gold)]/25 bg-gradient-to-br from-white to-[var(--brand-gold)]/[0.08]",
    icon: "bg-[var(--brand-gold)]/15 text-[var(--brand-gold)] ring-[var(--brand-gold)]/25",
    value: "text-[var(--brand-navy)]",
    bar: "bg-[var(--brand-gold)]",
  },
  coral: {
    card: "border-[var(--brand-coral)]/20 bg-gradient-to-br from-white to-[var(--brand-coral)]/[0.07]",
    icon: "bg-[var(--brand-coral)]/15 text-[var(--brand-coral)] ring-[var(--brand-coral)]/20",
    value: "text-[var(--brand-coral)]",
    bar: "bg-[var(--brand-coral)]",
  },
  soft: {
    card: "border-[var(--brand-navy)]/8 bg-gradient-to-br from-white to-slate-50",
    icon: "bg-amber-100/90 text-amber-800 ring-amber-600/15",
    value: "text-amber-900",
    bar: "bg-amber-500",
  },
} as const;

type UsersKpiCardsProps = {
  kpis: CompanyUserKpis;
  loading?: boolean;
};

export function UsersKpiCards({ kpis, loading = false }: UsersKpiCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KPI_META.map((kpi) => {
        const Icon = kpi.icon;
        const tone = TONE_STYLES[kpi.tone];

        return (
          <article
            key={kpi.key}
            className={cn(
              "group relative overflow-hidden rounded-2xl border px-4 py-4 shadow-sm",
              "transition-[transform,box-shadow,border-color] duration-300 ease-out",
              "hover:-translate-y-0.5 hover:border-[var(--brand-gold)]/35 hover:shadow-md",
              "motion-reduce:hover:translate-y-0",
              tone.card
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-0 top-0 h-[3px] opacity-90",
                tone.bar
              )}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[13px] font-medium text-[var(--brand-navy)]/65">
                  {kpi.title}
                </p>
                <p
                  className={cn(
                    "text-[2rem] font-bold leading-none tracking-tight tabular-nums",
                    tone.value
                  )}
                >
                  {loading ? "—" : kpis[kpi.key]}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {kpi.hint}
                </p>
              </div>

              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                  tone.icon
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.15} />
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
