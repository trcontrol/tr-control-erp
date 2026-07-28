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
    <section className="flex flex-col gap-4 rounded-[18px] border border-[var(--brand-navy)]/[0.04] bg-card px-5 py-4 shadow-soft sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-5">
      <p className="shrink-0 text-[11px] font-semibold tracking-wide text-[var(--brand-gold)]">
        Acesso rápido
      </p>
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2.5 rounded-full border border-[var(--brand-navy)]/[0.09] bg-[var(--brand-surface)]/80 px-[18px] text-[13px] font-semibold text-[var(--brand-navy)]",
                "transition-all duration-200 ease-out",
                "hover:border-[var(--brand-coral)]/40 hover:bg-white hover:shadow-sm",
                "active:scale-[0.98]"
              )}
            >
              <Icon
                className="h-[15px] w-[15px] text-[var(--brand-navy)]/55"
                strokeWidth={1.7}
              />
              <span className="whitespace-nowrap">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
