"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronsUpDown,
  LogOut,
  Menu,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/providers/tenant-provider";
import { ROUTES } from "@/lib/constants";

type HeaderProps = {
  userEmail?: string;
  onMenuClick?: () => void;
};

export function Header({ userEmail, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { company, companies, setActiveCompany } = useTenant();

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    []
  );

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(ROUTES.login);
    router.refresh();
  }

  const companyInitials = company?.name
    ?.split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const userInitial = userEmail?.[0]?.toUpperCase() ?? "U";
  const userName = userEmail?.split("@")[0] ?? "Usuário";

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--brand-navy)]/[0.05] bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex h-[88px] w-full max-w-[1400px] items-center gap-5 px-4 sm:gap-6 sm:px-6 md:px-8 lg:gap-8 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-[var(--brand-coral)]/10 text-[var(--brand-coral)] hover:bg-[var(--brand-coral)]/15 md:hidden"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </Button>

          <div className="hidden min-w-0 md:block">
            <p className="font-display text-[1.45rem] font-semibold leading-none tracking-tight text-[var(--brand-navy)]">
              TR Control
              <span className="ml-1.5 font-sans text-[0.95rem] font-bold tracking-[0.06em] text-[var(--brand-coral)]">
                ERP
              </span>
            </p>
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Gestão empresarial
            </p>
          </div>

          <div className="hidden h-11 w-px bg-[var(--brand-navy)]/8 lg:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-14 max-w-[260px] gap-3.5 rounded-full px-3 hover:bg-[var(--brand-navy)]/[0.04] sm:max-w-[320px]"
              >
                <Avatar className="h-11 w-11 ring-2 ring-[var(--brand-coral)]/30">
                  {company?.logo_url ? (
                    <AvatarImage src={company.logo_url} alt={company.name} />
                  ) : null}
                  <AvatarFallback className="bg-[var(--brand-navy)] text-[13px] font-semibold text-white">
                    {companyInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-[15px] font-semibold leading-tight text-[var(--brand-navy)] sm:text-base">
                  {company?.name ?? "Selecionar empresa"}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-40" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Empresas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companies.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => setActiveCompany(item.id)}
                >
                  {item.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden items-center gap-2.5 rounded-full bg-[var(--brand-navy)]/[0.03] px-4 py-2.5 text-sm text-muted-foreground xl:flex">
          <CalendarDays
            className="h-4 w-4 text-[var(--brand-gold)]"
            strokeWidth={1.75}
          />
          <span className="capitalize">{todayLabel}</span>
        </div>

        <div className="flex shrink-0 items-center gap-3.5 md:gap-5">
          <div className="hidden items-center gap-3 sm:flex">
            <Avatar className="h-10 w-10 ring-2 ring-[var(--brand-coral)]/20">
              <AvatarFallback className="bg-[var(--brand-coral)] text-xs font-semibold text-white">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 leading-tight md:block">
              <p className="max-w-[140px] truncate text-sm font-semibold text-[var(--brand-navy)]">
                {userName}
              </p>
              <p className="max-w-[140px] truncate text-[11px] text-muted-foreground">
                Conta ativa
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="h-10 gap-2 rounded-full border-[var(--brand-gold)]/50 px-4 text-[var(--brand-navy)] transition-all hover:border-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/10"
          >
            <LogOut
              className="h-3.5 w-3.5 text-[var(--brand-gold)]"
              strokeWidth={1.75}
            />
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] sm:inline">
              Sair
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
