"use client";

import Link from "next/link";
import {
  ListTodo,
  PackagePlus,
  ShoppingBag,
  ShoppingCart,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  PERMISSION_MODULES,
  type PermissionModuleId,
} from "@/lib/users/permissions";
import { useTenant } from "@/providers/tenant-provider";

type QuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: keyof typeof toneStyles;
  module: PermissionModuleId;
  /** Ação rápida exige create no módulo */
  requiresCreate: true;
};

const actions: QuickAction[] = [
  {
    href: ROUTES.salesNew,
    label: "Nova venda",
    icon: ShoppingBag,
    tone: "gold",
    module: PERMISSION_MODULES.sales,
    requiresCreate: true,
  },
  {
    href: ROUTES.purchasesNew,
    label: "Nova compra",
    icon: ShoppingCart,
    tone: "navy",
    module: PERMISSION_MODULES.purchases,
    requiresCreate: true,
  },
  {
    href: ROUTES.financeNew,
    label: "Lançamento",
    icon: Wallet,
    tone: "green",
    module: PERMISSION_MODULES.finance,
    requiresCreate: true,
  },
  {
    href: ROUTES.customersNew,
    label: "Novo cliente",
    icon: UserPlus,
    tone: "rose",
    module: PERMISSION_MODULES.customers,
    requiresCreate: true,
  },
  {
    href: ROUTES.productsNew,
    label: "Novo produto",
    icon: PackagePlus,
    tone: "coral",
    module: PERMISSION_MODULES.products,
    requiresCreate: true,
  },
  {
    href: ROUTES.tasksNew,
    label: "Nova tarefa",
    icon: ListTodo,
    tone: "purple",
    module: PERMISSION_MODULES.tasks,
    requiresCreate: true,
  },
];

const toneStyles = {
  gold: {
    icon: "bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]",
    hover: "hover:border-[var(--brand-gold)]/50",
  },
  navy: {
    icon: "bg-[var(--brand-navy)]/10 text-[var(--brand-navy)]",
    hover: "hover:border-[var(--brand-navy)]/25",
  },
  green: {
    icon: "bg-[#6a9e88]/15 text-[#4f7f6c]",
    hover: "hover:border-[#6a9e88]/45",
  },
  rose: {
    icon: "bg-[#e8c9d1]/70 text-[#c05c7d]",
    hover: "hover:border-[#c05c7d]/35",
  },
  coral: {
    icon: "bg-[var(--brand-coral)]/15 text-[var(--brand-coral)]",
    hover: "hover:border-[var(--brand-coral)]/40",
  },
  purple: {
    icon: "bg-[#7b6aae]/12 text-[#7b6aae]",
    hover: "hover:border-[#7b6aae]/40",
  },
} as const;

export function ExecutiveQuickActions() {
  const { allowedModules, creatableModules } = useTenant();

  const visible = actions.filter((action) => {
    if (!allowedModules.includes(action.module)) return false;
    if (action.requiresCreate && !creatableModules.includes(action.module)) {
      return false;
    }
    return true;
  });

  if (visible.length === 0) return null;

  const gridClass =
    visible.length >= 6
      ? "grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 xl:grid-cols-6"
      : visible.length >= 4
        ? "grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 xl:grid-cols-4"
        : "grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2";

  return (
    <section className="w-full min-w-0 rounded-[18px] border border-[var(--brand-navy)]/[0.05] bg-[linear-gradient(180deg,#fff_0%,#faf8f6_100%)] px-3 py-2.5 shadow-[0_2px_10px_rgb(17_32_59/0.035)] sm:px-4 sm:py-3">
      <p className="mb-2 text-left text-[11px] font-semibold tracking-[0.04em] text-[var(--brand-gold)] sm:mb-2.5">
        Acesso rápido
      </p>
      <div className={gridClass}>
        {visible.map((action) => {
          const Icon = action.icon;
          const tone = toneStyles[action.tone];
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "group flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-[var(--brand-navy)]/[0.06] bg-white px-2.5 py-2.5",
                "shadow-[0_2px_8px_rgb(17_32_59/0.035)]",
                "transition-all duration-300 ease-out",
                "hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-[#fffdfd]",
                "hover:shadow-[0_10px_22px_rgb(17_32_59/0.1)]",
                "active:translate-y-0 active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
                "motion-reduce:transition-none motion-reduce:hover:scale-100",
                tone.hover,
                "sm:px-3 sm:py-3"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10",
                  tone.icon
                )}
              >
                <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.8} />
              </span>
              <span className="truncate text-center text-[11.5px] font-semibold text-[#0f1b33] sm:text-[12.5px]">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
