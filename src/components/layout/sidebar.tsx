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
  { name: "Dashboard Executivo", href: ROUTES.dashboard, icon: LayoutDashboard },
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
          "fixed inset-0 z-40 bg-[var(--brand-navy)]/50 backdrop-blur-[2px] transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 md:static md:z-0 md:w-64 md:translate-x-0 md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link
            href={ROUTES.dashboard}
            onClick={onClose}
            className="flex items-center gap-2.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-gold)] text-[var(--brand-navy-deep)] shadow-sm">
              <Building2 className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide text-white">
                TR Control
              </span>
              <span className="block text-[11px] text-[var(--brand-gold-soft)]">
                ERP Premium
              </span>
            </span>
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white md:hidden"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
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
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-white shadow-sm"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-white"
                )}
              >
                {isActive ? (
                  <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[var(--brand-gold)]" />
                ) : null}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive
                      ? "text-[var(--brand-gold)]"
                      : "text-sidebar-foreground/60 group-hover:text-[var(--brand-coral)]"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/50">
          Isolamento por empresa ativa
        </div>
      </aside>
    </>
  );
}
