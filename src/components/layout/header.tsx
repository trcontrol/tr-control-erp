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
    <header className="sticky top-0 z-30 border-b border-[var(--brand-navy)]/[0.045] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[96px] w-full max-w-[1400px] items-center gap-5 px-4 py-3.5 sm:gap-6 sm:px-6 md:px-8 lg:gap-8 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-[var(--brand-coral)]/12 text-[var(--brand-coral)] hover:bg-[var(--brand-coral)]/18 lg:hidden"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.7} />
          </Button>

          <div className="hidden min-w-0 md:block">
            <p className="font-display text-[1.55rem] font-semibold leading-none tracking-tight text-[var(--brand-navy)] lg:text-[1.65rem]">
              TR Control
              <span className="ml-1.5 font-sans text-[0.82rem] font-semibold tracking-[0.04em] text-[var(--brand-coral)] lg:text-[0.88rem]">
                ERP
              </span>
            </p>
            <p className="mt-2 text-[11px] font-medium text-muted-foreground">
              Gestão empresarial
            </p>
          </div>

          <div className="hidden h-12 w-px bg-[var(--brand-navy)]/[0.07] lg:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-[3.6rem] max-w-[280px] gap-3.5 rounded-2xl px-2.5 hover:bg-[var(--brand-navy)]/[0.035] sm:max-w-[340px]"
              >
                <Avatar className="h-12 w-12 ring-2 ring-[var(--brand-coral)]/25 ring-offset-2 ring-offset-white">
                  {company?.logo_url ? (
                    <AvatarImage src={company.logo_url} alt={company.name} />
                  ) : null}
                  <AvatarFallback className="bg-[var(--brand-navy)] text-[13px] font-semibold text-white">
                    {companyInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 text-left">
                  <span className="block truncate text-[15px] font-semibold leading-tight text-[var(--brand-navy)] sm:text-[16px]">
                    {company?.name ?? "Selecionar empresa"}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
                    Empresa ativa
                  </span>
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-35" />
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

        <div className="hidden items-center gap-2.5 rounded-full border border-[var(--brand-navy)]/[0.05] bg-[var(--brand-navy)]/[0.025] px-4 py-2.5 text-[13px] text-muted-foreground xl:flex">
          <CalendarDays
            className="h-4 w-4 text-[var(--brand-gold)]"
            strokeWidth={1.7}
          />
          <span className="capitalize leading-none">{todayLabel}</span>
        </div>

        <div className="flex shrink-0 items-center gap-3.5 md:gap-5">
          <div className="hidden items-center gap-3 sm:flex">
            <Avatar className="h-10 w-10 ring-2 ring-[var(--brand-navy)]/[0.06]">
              <AvatarFallback className="bg-[var(--brand-coral)]/90 text-xs font-semibold text-white">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 leading-tight md:block">
              <p className="max-w-[150px] truncate text-[13.5px] font-semibold text-[var(--brand-navy)]">
                {userName}
              </p>
              <p className="max-w-[150px] truncate text-[11px] text-muted-foreground">
                Conta ativa
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="h-10 gap-2 rounded-full border-[var(--brand-gold)]/45 bg-transparent px-4 text-[var(--brand-navy)] transition-all hover:border-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/[0.08]"
          >
            <LogOut
              className="h-3.5 w-3.5 text-[var(--brand-gold)]"
              strokeWidth={1.7}
            />
            <span className="hidden text-[12px] font-semibold sm:inline">
              Sair
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
