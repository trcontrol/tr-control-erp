"use client";

import Link from "next/link";
import {
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
] as const;

export function ExecutiveQuickActions() {
  return (
    <section className="w-full min-w-0 rounded-[18px] border border-[var(--brand-navy)]/[0.04] bg-card px-4 py-3.5 shadow-soft sm:px-5 sm:py-4">
      <p className="mb-3 text-[11px] font-semibold tracking-wide text-[var(--brand-gold)]">
        Acesso rápido
      </p>
      <div className="flex min-w-0 gap-2.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--brand-navy)]/[0.09] bg-[var(--brand-surface)]/80 px-3.5 text-[13px] font-semibold text-[var(--brand-navy)]",
                "min-w-[9.75rem] sm:min-w-0 sm:w-full sm:shrink",
                "transition-all duration-200 ease-out",
                "hover:border-[var(--brand-coral)]/40 hover:bg-white hover:shadow-sm",
                "active:scale-[0.98]"
              )}
            >
              <Icon
                className="h-[15px] w-[15px] shrink-0 text-[var(--brand-navy)]/55"
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
