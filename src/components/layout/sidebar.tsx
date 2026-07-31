"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Building2,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";

const navigation = [
  { name: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { name: "Empresas", href: ROUTES.companies, icon: Building2 },
  { name: "Clientes", href: ROUTES.customers, icon: UsersRound },
  { name: "Fornecedores", href: ROUTES.suppliers, icon: Truck },
  { name: "Produtos", href: ROUTES.products, icon: Package },
  { name: "Estoque", href: ROUTES.stock, icon: Warehouse },
  { name: "Compras", href: ROUTES.purchases, icon: ShoppingCart },
  { name: "Vendas", href: ROUTES.sales, icon: ShoppingBag },
  { name: "Financeiro", href: ROUTES.finance, icon: Wallet },
  { name: "Fluxo de Caixa", href: ROUTES.cashFlow, icon: ArrowLeftRight },
  { name: "Usuários", href: "/users", icon: Users },
  { name: "Configurações", href: "/settings", icon: Settings },
];

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-[var(--brand-navy-deep)]/55 backdrop-blur-[3px] transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(296px,88vw)] flex-col",
          "bg-sidebar text-sidebar-foreground",
          "rounded-none shadow-elevated",
          "transition-transform duration-300 ease-out",
          "sm:w-[280px]",
          "md:w-[256px] md:rounded-r-2xl",
          "lg:static lg:z-0 lg:w-[252px] lg:translate-x-0 lg:rounded-none lg:shadow-none",
          "xl:w-[268px]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="shrink-0 px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={ROUTES.dashboard}
              onClick={onClose}
              className="group min-w-0 rounded-xl outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/50"
            >
              <BrandLogo />
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-0.5 h-9 w-9 shrink-0 rounded-xl text-sidebar-foreground hover:bg-white/10 hover:text-white lg:hidden"
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Divisor */}
        <div className="shrink-0 px-4 sm:px-5" aria-hidden>
          <div className="h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
        </div>

        {/* Menu */}
        <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3 sm:mt-7 sm:px-3.5">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== ROUTES.dashboard &&
                pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-[var(--brand-coral)] text-white shadow-[0_4px_14px_rgb(196_147_159_/35%)]"
                    : "text-sidebar-foreground/70 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-white"
                      : "text-sidebar-foreground/45 group-hover:text-[var(--brand-gold-soft)]"
                  )}
                  strokeWidth={1.5}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Espaço flexível implícito via flex-1 no nav; bloco inferior ancorado */}
        <div className="mt-auto shrink-0 px-3.5 pb-5 pt-2 sm:px-4 sm:pb-6">
          <div className="rounded-2xl border border-[var(--brand-gold)]/30 bg-gradient-to-br from-white/[0.08] to-transparent px-4 py-4 shadow-[inset_0_1px_0_rgb(255_255_255_/6%)]">
            <div className="mb-2.5 flex items-center gap-2 text-[var(--brand-gold-soft)]">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                Visão
              </span>
            </div>
            <p className="font-display text-[13px] italic leading-relaxed text-[var(--brand-gold-soft)]/95">
              Controle claro. Decisões rápidas.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
