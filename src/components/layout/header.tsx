"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronsUpDown, LogOut, Menu } from "lucide-react";
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
        year: "numeric",
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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/80 bg-white/90 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="max-w-[220px] gap-2 border-[var(--brand-navy)]/15 bg-white hover:bg-[var(--brand-navy)]/[0.03] sm:max-w-[280px]"
            >
              <Avatar className="h-6 w-6">
                {company?.logo_url ? (
                  <AvatarImage src={company.logo_url} alt={company.name} />
                ) : null}
                <AvatarFallback className="bg-[var(--brand-navy)] text-[10px] text-white">
                  {companyInitials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium text-[var(--brand-navy)]">
                {company?.name ?? "Selecionar empresa"}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
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

        <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
          <CalendarDays className="h-4 w-4 text-[var(--brand-coral)]" />
          <span className="capitalize">{todayLabel}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-[var(--brand-navy)]/[0.03] px-3 py-1.5 sm:flex">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-[var(--brand-navy)] text-xs text-white">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[180px] truncate text-sm text-[var(--brand-navy)]">
            {userEmail ?? "Usuário"}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="gap-2 border-[var(--brand-coral)]/30 text-[var(--brand-navy)] hover:border-[var(--brand-coral)] hover:bg-[var(--brand-coral)]/10"
        >
          <LogOut className="h-4 w-4 text-[var(--brand-coral)]" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
