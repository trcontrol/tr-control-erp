"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  Calendar,
  LayoutDashboard,
  ListTodo,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Target,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { TENANT_NAVIGATION } from "@/lib/plans/navigation";
import { useTenant } from "@/providers/tenant-provider";
import type { PermissionModuleId } from "@/lib/users/permissions";

const ICONS: Record<string, LucideIcon> = {
  [ROUTES.dashboard]: LayoutDashboard,
  [ROUTES.companies]: Building2,
  [ROUTES.customers]: UsersRound,
  [ROUTES.suppliers]: Truck,
  [ROUTES.products]: Package,
  [ROUTES.stock]: Warehouse,
  [ROUTES.purchases]: ShoppingCart,
  [ROUTES.funnel]: Target,
  [ROUTES.sales]: ShoppingBag,
  [ROUTES.finance]: Wallet,
  [ROUTES.cashFlow]: ArrowLeftRight,
  [ROUTES.tasks]: ListTodo,
  [ROUTES.agenda]: Calendar,
  [ROUTES.reports]: BarChart3,
  [ROUTES.users]: Users,
  [ROUTES.settings]: Settings,
};

const platformNavigation = [
  {
    name: "Gestão de Empresas",
    href: ROUTES.adminCompanies,
    icon: Shield,
  },
];

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
  /** Super Admin da plataforma (não confundir com admin do tenant) */
  isPlatformAdmin?: boolean;
};

function NavLink({
  href,
  name,
  icon: Icon,
  active,
  onClose,
}: {
  href: string;
  name: string;
  icon: LucideIcon;
  active: boolean;
  onClose?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200",
        active
          ? "bg-[var(--brand-coral)] text-white shadow-[0_4px_14px_rgb(196_147_159_/35%)]"
          : "text-sidebar-foreground/70 hover:bg-white/[0.06] hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active
            ? "text-white"
            : "text-sidebar-foreground/45 group-hover:text-[var(--brand-gold-soft)]"
        )}
        strokeWidth={1.5}
      />
      <span className="truncate">{name}</span>
    </Link>
  );
}

function isModuleAllowed(
  module: PermissionModuleId | null,
  allowedModules: PermissionModuleId[]
) {
  // /companies: fora do catálogo comercial nesta fase — permanece visível.
  if (module === null) return true;
  return allowedModules.includes(module);
}

export function Sidebar({
  open = false,
  onClose,
  isPlatformAdmin = false,
}: SidebarProps) {
  const pathname = usePathname();
  const { allowedModules } = useTenant();

  const visibleNav = TENANT_NAVIGATION.filter((item) =>
    isModuleAllowed(item.module, allowedModules)
  );

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
          "fixed inset-y-0 left-0 z-50 flex h-full min-h-0 w-[min(296px,88vw)] flex-col",
          "bg-sidebar text-sidebar-foreground",
          "rounded-none shadow-elevated",
          "transition-transform duration-300 ease-out",
          "sm:w-[280px]",
          "md:w-[256px] md:rounded-r-2xl",
          "lg:static lg:z-0 lg:h-auto lg:min-h-screen lg:w-[252px] lg:translate-x-0 lg:rounded-none lg:shadow-none",
          "xl:w-[268px]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
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

        <div className="shrink-0 px-4 sm:px-5" aria-hidden>
          <div className="h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
        </div>

        {isPlatformAdmin ? (
          <div
            className="shrink-0 px-3 pb-1 pt-5 sm:px-3.5 sm:pt-6"
            data-testid="platform-nav"
          >
            <p className="mb-1 px-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-gold-soft)]">
              Plataforma
            </p>
            {platformNavigation.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                name={item.name}
                icon={item.icon}
                active={
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)
                }
                onClose={onClose}
              />
            ))}
            <div className="mt-3 px-2" aria-hidden>
              <div className="h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
            </div>
          </div>
        ) : null}

        <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3 sm:mt-5 sm:px-3.5">
          {visibleNav.map((item) => {
            const Icon = ICONS[item.href] ?? LayoutDashboard;
            return (
              <NavLink
                key={item.href}
                href={item.href}
                name={item.name}
                icon={Icon}
                active={
                  pathname === item.href ||
                  (item.href !== ROUTES.dashboard &&
                    pathname.startsWith(`${item.href}/`))
                }
                onClose={onClose}
              />
            );
          })}
        </nav>
      </aside>
    </>
  );
}
