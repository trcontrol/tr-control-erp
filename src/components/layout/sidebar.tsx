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
          "fixed inset-0 z-40 bg-[var(--brand-navy-deep)]/55 backdrop-blur-[3px] transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[276px] flex-col bg-sidebar text-sidebar-foreground shadow-elevated transition-transform duration-300 ease-out md:static md:z-0 md:w-[240px] md:translate-x-0 md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="relative px-5 pb-2 pt-8">
          <div
            className="absolute left-5 top-0 h-1 w-10 rounded-b-full bg-[var(--brand-gold)]"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-2">
            <Link
              href={ROUTES.dashboard}
              onClick={onClose}
              className="group min-w-0"
            >
              <span className="font-display block text-[1.65rem] font-semibold leading-none tracking-tight text-white transition-opacity group-hover:opacity-95">
                TR Control
              </span>
              <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-gold-soft)]">
                ERP Premium
              </span>
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-white/10 hover:text-white md:hidden"
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1.5 overflow-y-auto px-3.5 pb-4">
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
                  "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-colors duration-200",
                  isActive
                    ? "bg-[var(--brand-coral)] text-white"
                    : "text-sidebar-foreground/65 hover:bg-white/[0.05] hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-white"
                      : "text-sidebar-foreground/40 group-hover:text-[var(--brand-gold-soft)]"
                  )}
                  strokeWidth={1.5}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pb-6 pt-2">
          <div className="rounded-2xl border border-[var(--brand-gold)]/35 bg-gradient-to-br from-white/[0.07] to-transparent px-4 py-4">
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
