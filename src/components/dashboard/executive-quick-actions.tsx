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
    iconClass: "text-[var(--brand-coral)]",
  },
  {
    href: ROUTES.purchasesNew,
    label: "Nova compra",
    icon: ShoppingCart,
    iconClass: "text-[var(--brand-navy)]",
  },
  {
    href: ROUTES.financeNew,
    label: "Lançamento",
    icon: Wallet,
    iconClass: "text-[var(--brand-gold)]",
  },
  {
    href: ROUTES.customersNew,
    label: "Novo cliente",
    icon: UserPlus,
    iconClass: "text-[var(--brand-teal)]",
  },
  {
    href: ROUTES.productsNew,
    label: "Novo produto",
    icon: PackagePlus,
    iconClass: "text-[var(--brand-sky)]",
  },
] as const;

export function ExecutiveQuickActions() {
  return (
    <section className="flex flex-col gap-3.5 rounded-[16px] bg-card px-5 py-4 shadow-card sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:py-[18px]">
      <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
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
                "inline-flex h-10 shrink-0 items-center gap-2.5 rounded-full border border-[var(--brand-navy)]/10 bg-[var(--brand-surface)] px-4 text-[13px] font-semibold text-[var(--brand-navy)]",
                "transition-all duration-200 ease-out",
                "hover:border-[var(--brand-coral)]/35 hover:bg-white hover:shadow-sm hover:text-[var(--brand-navy)]",
                "active:scale-[0.98]"
              )}
            >
              <Icon
                className={cn("h-4 w-4", action.iconClass)}
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
