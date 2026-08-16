"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/providers/tenant-provider";

type ExecutivePageShellProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
};

function firstNameFromDisplayName(fullName: string) {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function firstNameFromSources(params: {
  profileFullName?: string | null;
  user: {
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null;
}) {
  const profileName = params.profileFullName?.trim();
  if (profileName) {
    return firstNameFromDisplayName(profileName);
  }

  const meta = params.user?.user_metadata;
  const fromMeta = [meta?.full_name, meta?.name, meta?.first_name].find(
    (value) => typeof value === "string" && value.trim()
  ) as string | undefined;

  if (fromMeta) {
    return firstNameFromDisplayName(fromMeta);
  }

  const local = params.user?.email?.split("@")[0]?.trim();
  if (!local) return null;

  const part = local.split(/[._-]/)[0] ?? local;
  if (!part) return null;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

export function ExecutivePageShell({
  children,
}: ExecutivePageShellProps) {
  const { company } = useTenant();
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setFirstName(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setFirstName(
        firstNameFromSources({
          profileFullName:
            (profile as { full_name?: string | null } | null)?.full_name ??
            null,
          user,
        })
      );
    })();
  }, []);

  const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";

  return (
    <div className="min-w-0 space-y-2.5 sm:space-y-3 md:space-y-3.5">
      <header className="min-w-0 rounded-[18px] border border-[var(--brand-navy)]/[0.05] bg-[linear-gradient(135deg,#ffffff_0%,#f7eef1_45%,#fffdf8_100%)] px-3.5 py-3 shadow-[0_2px_12px_rgb(17_32_59/0.04)] sm:px-5 sm:py-3.5 md:px-6">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          <span
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--brand-gold)]/30 bg-white/85 text-[var(--brand-gold)] shadow-[0_2px_8px_rgb(200_155_60/0.12)] sm:h-10 sm:w-10"
            aria-hidden
          >
            <Sparkles className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-left font-display text-[1.45rem] font-semibold leading-[1.2] tracking-tight text-[var(--brand-navy)] sm:text-[1.85rem]">
              {greeting}
            </h1>
            <p className="mt-1 max-w-2xl text-left text-[13px] leading-relaxed text-[var(--brand-navy)]/55 sm:mt-1.5 sm:text-[14.5px]">
              Aqui está um resumo do seu dia.
            </p>
          </div>
        </div>
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
