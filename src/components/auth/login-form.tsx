"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, ShieldCheck, Activity, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getAccessRequestWhatsAppUrl, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

function getSafeRedirect(redirectTo: string | null) {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return ROUTES.dashboard;
  }

  return redirectTo;
}

const HIGHLIGHTS = [
  { icon: LayoutGrid, label: "Gestão integrada" },
  { icon: ShieldCheck, label: "Acesso seguro" },
  { icon: Activity, label: "Informações em tempo real" },
] as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const accessRequestUrl = getAccessRequestWhatsAppUrl();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push(getSafeRedirect(searchParams.get("redirectTo")));
      router.refresh();
    } catch (err) {
      console.error("Erro no login:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro inesperado ao entrar. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#f7f8fb]">
      {/* ── Institutional panel (desktop) ── */}
      <aside
        className="relative hidden w-[48%] flex-col justify-start overflow-hidden bg-[var(--brand-navy-deep)] px-10 py-10 text-white lg:flex xl:w-[52%] xl:px-14"
        aria-hidden={false}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-[var(--brand-gold)]/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[var(--brand-coral)]/[0.07] blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative z-10">
          <Link
            href={ROUTES.home}
            className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-navy-deep)]"
          >
            <Image
              src="/brand/logo-tr-control-erp-dark-bg.png"
              alt="TR Control ERP — Gestão que impulsiona."
              width={1024}
              height={341}
              priority
              className="h-auto w-[330px] max-w-full object-contain object-left xl:w-[360px]"
            />
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-6 pt-14">
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Sua empresa sob controle.
            <br />
            <span className="text-[var(--brand-gold-soft)]">
              Suas decisões mais inteligentes.
            </span>
          </h1>
          <p className="text-base leading-relaxed text-white/70">
            Centralize sua gestão e acompanhe o que realmente importa para o
            crescimento do seu negócio.
          </p>
          <ul className="flex flex-col gap-3 pt-2">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 ring-1 ring-white/10">
                  <item.icon
                    className="h-4 w-4 text-[var(--brand-gold-soft)]"
                    aria-hidden
                  />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <div className="relative flex w-full flex-1 flex-col px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mb-6 lg:mb-0">
          <Link
            href={ROUTES.home}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--brand-navy-mid)]/70 transition-colors hover:text-[var(--brand-navy-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar para o site
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link
              href={ROUTES.home}
              className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
            >
              <Image
                src="/brand/logo-tr-control-erp-display.png"
                alt="TR Control ERP — Gestão que impulsiona."
                width={922}
                height={339}
                priority
                className="h-14 w-auto object-contain sm:h-16"
              />
            </Link>
          </div>

          <div className="rounded-2xl border border-[var(--brand-navy)]/8 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
            <div className="mb-6 space-y-1.5">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--brand-navy-deep)]">
                Bem-vindo de volta
              </h2>
              <p className="text-sm leading-relaxed text-[var(--brand-navy-mid)]/75">
                Acesse sua conta para continuar no TR Control ERP.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/20 bg-destructive/8 px-3.5 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-[var(--brand-navy-deep)]"
                >
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 border-[var(--brand-navy)]/12 bg-[#f7f8fb] focus-visible:ring-[var(--brand-gold)]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="password"
                    className="text-[var(--brand-navy-deep)]"
                  >
                    Senha
                  </Label>
                  <Link
                    href={ROUTES.forgotPassword}
                    className="text-xs font-medium text-[var(--brand-navy-mid)] transition-colors hover:text-[var(--brand-navy-deep)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 border-[var(--brand-navy)]/12 bg-[#f7f8fb] focus-visible:ring-[var(--brand-gold)]"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  "h-11 w-full bg-[var(--brand-navy-deep)] text-white shadow-sm",
                  "hover:bg-[var(--brand-navy-mid)]",
                  "focus-visible:ring-[var(--brand-gold)]",
                  "disabled:opacity-60"
                )}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3" aria-hidden>
                <div className="h-px flex-1 bg-[var(--brand-navy)]/10" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--brand-navy-mid)]/45">
                  ou
                </span>
                <div className="h-px flex-1 bg-[var(--brand-navy)]/10" />
              </div>

              <div className="text-center text-sm text-[var(--brand-navy-mid)]/80">
                <p className="mb-1">Ainda não possui acesso?</p>
                {accessRequestUrl ? (
                  <a
                    href={accessRequestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--brand-navy-deep)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
                  >
                    Solicitar acesso
                  </a>
                ) : (
                  <span className="font-semibold text-[var(--brand-navy-deep)]">
                    Solicitar acesso
                  </span>
                )}
                <p className="mt-3 text-xs leading-relaxed text-[var(--brand-navy-mid)]/55">
                  O acesso ao TR Control ERP é liberado após a contratação.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
