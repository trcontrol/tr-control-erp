"use client";

import Link from "next/link";
import {
  ListTodo,
  PackagePlus,
  ShoppingBag,
  ShoppingCart,
  UserPlus,
  Wallet,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const actions = [
  {
    href: ROUTES.salesNew,
    label: "Nova venda",
    icon: ShoppingBag,
  },
  {
    href: ROUTES.purchasesNew,
    label: "Nova compra",
    icon: ShoppingCart,
  },
  {
    href: ROUTES.financeNew,
    label: "Lançamento",
    icon: Wallet,
  },
  {
    href: ROUTES.customersNew,
    label: "Novo cliente",
    icon: UserPlus,
  },
  {
    href: ROUTES.productsNew,
    label: "Novo produto",
    icon: PackagePlus,
  },
  {
    href: ROUTES.tasksNew,
    label: "Nova tarefa",
    icon: ListTodo,
  },
] as const;

export function ExecutiveQuickActions() {
  return (
    <section className="w-full min-w-0 rounded-[18px] border border-[var(--brand-navy)]/[0.04] bg-card px-3.5 py-3 shadow-soft sm:px-5 sm:py-4">
      <p className="mb-2.5 text-left text-[11px] font-semibold tracking-wide text-[var(--brand-gold)] sm:mb-3">
        Acesso rápido
      </p>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "inline-flex h-10 min-w-0 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--brand-navy)]/[0.09] bg-[var(--brand-surface)]/80 px-2 text-[12px] font-semibold text-[var(--brand-navy)] sm:h-11 sm:gap-2 sm:px-3.5 sm:text-[13px]",
                "transition-all duration-200 ease-out",
                "hover:border-[var(--brand-coral)]/40 hover:bg-white hover:shadow-sm",
                "active:scale-[0.98]"
              )}
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0 text-[var(--brand-navy)]/55 sm:h-[15px] sm:w-[15px]"
                strokeWidth={1.7}
              />
              <span className="truncate">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
