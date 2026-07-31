"use client";

import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { useTenant } from "@/providers/tenant-provider";

type ExecutivePageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function ExecutivePageShell({
  title,
  description,
  children,
}: ExecutivePageShellProps) {
  const { company } = useTenant();

  return (
    <div className="min-w-0 space-y-4 md:space-y-5">
      <header className="min-w-0 border-b border-[var(--brand-navy)]/[0.05] pb-3.5 md:pb-4">
        <h1 className="font-display text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[var(--brand-navy)] sm:text-[2.15rem]">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
          {description}
        </p>
      </header>

      {!company ? (
        <Card className="rounded-2xl border-0 shadow-card">
          <CardHeader>
            <CardTitle>Nenhuma empresa ativa</CardTitle>
            <CardDescription>
              Selecione uma empresa no topo da página para continuar.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button
              asChild
              className="rounded-xl bg-[var(--brand-coral)] hover:bg-[var(--brand-coral)]/90"
            >
              <Link href={ROUTES.companies}>Ir para Empresas</Link>
            </Button>
          </div>
        </Card>
      ) : (
        children
      )}
    </div>
  );
}
