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
    <div className="min-w-0 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-navy)] md:text-3xl">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          {description}
          {company ? ` — ${company.name}` : ""}
        </p>
      </div>

      {!company ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma empresa ativa</CardTitle>
            <CardDescription>
              Selecione uma empresa no topo da página para continuar.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button asChild>
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
