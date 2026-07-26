"use client";

import Link from "next/link";
import {
  PackagePlus,
  ShoppingBag,
  ShoppingCart,
  UserPlus,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

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
    label: "Novo lançamento",
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
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.href}
            asChild
            variant="outline"
            className="border-[var(--brand-navy)]/15 bg-white text-[var(--brand-navy)] hover:border-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/10"
          >
            <Link href={action.href}>
              <Icon className="h-4 w-4 text-[var(--brand-coral)]" />
              {action.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
