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

const actions = [
  {
    href: ROUTES.salesNew,
    label: "Venda",
    icon: ShoppingBag,
  },
  {
    href: ROUTES.purchasesNew,
    label: "Compra",
    icon: ShoppingCart,
  },
  {
    href: ROUTES.financeNew,
    label: "Lançamento",
    icon: Wallet,
  },
  {
    href: ROUTES.customersNew,
    label: "Cliente",
    icon: UserPlus,
  },
  {
    href: ROUTES.productsNew,
    label: "Produto",
    icon: PackagePlus,
  },
] as const;

export function ExecutiveQuickActions() {
  return (
    <div className="rounded-xl border border-[var(--brand-navy)]/10 bg-[var(--brand-navy)]/[0.02] p-2">
      <div className="flex gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[var(--brand-navy)]/10 bg-white px-3 text-sm font-medium text-[var(--brand-navy)] transition-colors hover:border-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/10"
            >
              <Icon className="h-3.5 w-3.5 text-[var(--brand-coral)]" />
              {action.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
