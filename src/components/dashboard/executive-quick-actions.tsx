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
    <section className="flex flex-col gap-3 rounded-[14px] bg-card px-4 py-3.5 shadow-card sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-gold)]">
        Acesso rápido
      </p>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--brand-navy)]/10 bg-transparent px-3.5 text-[12.5px] font-semibold text-[var(--brand-navy)]",
                "transition-colors duration-200 hover:border-[var(--brand-navy)]/20 hover:bg-[var(--brand-navy)]/[0.03]"
              )}
            >
              <Icon
                className={cn("h-3.5 w-3.5", action.iconClass)}
                strokeWidth={1.7}
              />
              {action.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
