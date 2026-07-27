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
    <div className="min-w-0">
      <h1 className="sr-only">{title}</h1>
      <p className="sr-only">
        {description}
        {company ? ` — ${company.name}` : ""}
      </p>

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
