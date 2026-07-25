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

type StockPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export function StockPageShell({
  title,
  description,
  children,
  actions,
}: StockPageShellProps) {
  const { company } = useTenant();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {actions}
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
