"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  ShoppingCart,
  Package,
  UsersRound,
  Users,
  Truck,
  LayoutGrid,
  BarChart3,
  Globe2,
  TrendingUp,
  ShieldCheck,
  Building2,
  Menu,
  X,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/landing/brand-logo";
import { AccessRequestCta } from "@/components/landing/access-request-cta";
import { DashboardPreview } from "@/components/landing/dashboard-preview";

const NAV_ITEMS = [
  { href: "#solucoes", label: "Soluções" },
  { href: "#beneficios", label: "Benefícios" },
  { href: "#seguranca", label: "Segurança" },
  { href: "#sobre", label: "Sobre" },
] as const;

const SOLUTIONS = [
  {
    icon: Wallet,
    title: "Financeiro",
    description:
      "Controle contas a pagar e a receber e acompanhe a movimentação financeira da empresa.",
  },
  {
    icon: ShoppingCart,
    title: "Vendas",
    description:
      "Gerencie vendas, clientes e o fluxo comercial da sua empresa.",
  },
  {
    icon: Truck,
    title: "Compras",
    description:
      "Organize fornecedores, compras e seus reflexos financeiros e de estoque.",
  },
  {
    icon: Package,
    title: "Estoque",
    description:
      "Controle entradas, saídas, ajustes, inventário e níveis mínimos.",
  },
  {
    icon: UsersRound,
    title: "Clientes",
    description:
      "Centralize informações e mantenha o histórico dos seus clientes organizado.",
  },
  {
    icon: Users,
    title: "Equipe",
    description:
      "Gerencie usuários, acessos e permissões de acordo com o plano contratado.",
  },
] as const;

const BENEFITS = [
  {
    icon: LayoutGrid,
    title: "Gestão centralizada",
    description:
      "Informações importantes da operação reunidas em um único sistema.",
  },
  {
    icon: BarChart3,
    title: "Decisões com informação",
    description:
      "Dashboards e relatórios ajudam a acompanhar o desempenho da empresa.",
  },
  {
    icon: Globe2,
    title: "Acesso de onde estiver",
    description:
      "Utilize o sistema pelo navegador para acompanhar sua empresa.",
  },
  {
    icon: TrendingUp,
    title: "Preparado para crescer",
    description:
      "Planos e recursos pensados para acompanhar diferentes necessidades de gestão.",
  },
] as const;

const HERO_POINTS = [
  { icon: Layers, label: "Gestão integrada" },
  { icon: Globe2, label: "Acesso online" },
  { icon: Building2, label: "Feito para pequenas empresas" },
] as const;

const SECURITY_POINTS = [
  "Usuários e permissões",
  "Acesso por empresa",
  "Planos com recursos definidos",
] as const;

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8fb] text-[var(--brand-navy-deep)]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-[var(--brand-navy)]/8 bg-[#f7f8fb]/92 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[5.5rem] sm:px-6 lg:h-[6.25rem] lg:px-8">
          <BrandLogo priority />

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Navegação principal"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-[var(--brand-navy-mid)] transition-colors hover:text-[var(--brand-navy-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <Button
              variant="ghost"
              className="text-[var(--brand-navy-mid)] hover:bg-[var(--brand-navy)]/5 hover:text-[var(--brand-navy-deep)]"
              asChild
            >
              <Link href={ROUTES.login}>Entrar</Link>
            </Button>
            <AccessRequestCta
              showArrow
              className="bg-[var(--brand-navy-deep)] text-white shadow-sm hover:bg-[var(--brand-navy-mid)]"
            />
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--brand-navy-deep)] hover:bg-[var(--brand-navy)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div
          id="landing-mobile-nav"
          className={cn(
            "border-t border-[var(--brand-navy)]/8 bg-[#f7f8fb] lg:hidden",
            mobileOpen ? "block" : "hidden"
          )}
        >
          <nav
            className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6"
            aria-label="Navegação mobile"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--brand-navy-mid)] hover:bg-[var(--brand-navy)]/5"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-[var(--brand-navy)]/8 pt-3 sm:hidden">
              <Button variant="outline" asChild>
                <Link href={ROUTES.login}>Entrar</Link>
              </Button>
              <AccessRequestCta showArrow className="w-full bg-[var(--brand-navy-deep)] text-white hover:bg-[var(--brand-navy-mid)]" />
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section
          className="relative overflow-hidden bg-[var(--brand-navy-deep)] text-white"
          aria-labelledby="hero-heading"
        >
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
          >
            <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[var(--brand-gold)]/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[var(--brand-coral)]/[0.06] blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          </div>

          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-10 lg:px-8 lg:py-20">
            <div className="max-w-xl">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-gold-soft)]">
                TR Control ERP
              </p>
              <h1
                id="hero-heading"
                className="font-display text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.25rem]"
              >
                Gestão completa.
                <br />
                <span className="text-[var(--brand-gold-soft)]">
                  Resultados reais.
                </span>
              </h1>
              <p className="mt-6 text-base leading-relaxed text-white/75 sm:text-lg">
                O TR Control ERP centraliza as principais áreas da sua empresa
                em uma plataforma de gestão integrada, organizada e preparada
                para acompanhar o crescimento do seu negócio.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <AccessRequestCta
                  size="lg"
                  className="bg-[var(--brand-gold)] text-[var(--brand-navy-deep)] shadow-md hover:bg-[var(--brand-gold-soft)]"
                />
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <Link href={ROUTES.login}>Entrar</Link>
                </Button>
              </div>

              <ul className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-3">
                {HERO_POINTS.map((point) => (
                  <li
                    key={point.label}
                    className="flex items-center gap-2 text-sm text-white/70"
                  >
                    <point.icon
                      className="h-4 w-4 shrink-0 text-[var(--brand-gold-soft)]"
                      aria-hidden
                    />
                    {point.label}
                  </li>
                ))}
              </ul>
            </div>

            <DashboardPreview />
          </div>
        </section>

        {/* ── Soluções ── */}
        <section
          id="solucoes"
          className="scroll-mt-24 bg-[#f7f8fb] py-16 sm:py-20 lg:py-24"
          aria-labelledby="solucoes-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
                Soluções completas
              </p>
              <h2
                id="solucoes-heading"
                className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--brand-navy-deep)] sm:text-4xl"
              >
                Tudo o que sua empresa precisa em um só lugar
              </h2>
            </div>

            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {SOLUTIONS.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-[var(--brand-navy)]/8 bg-white p-6 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-navy-deep)]/5 text-[var(--brand-navy-deep)]">
                    <item.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--brand-navy-deep)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--brand-navy-mid)]/80">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Benefícios ── */}
        <section
          id="beneficios"
          className="scroll-mt-24 relative overflow-hidden bg-[var(--brand-navy-deep)] py-16 text-white sm:py-20 lg:py-24"
          aria-labelledby="beneficios-heading"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, var(--brand-gold) 0, transparent 40%), radial-gradient(circle at 80% 80%, var(--brand-coral) 0, transparent 35%)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold-soft)]">
                Benefícios
              </p>
              <h2
                id="beneficios-heading"
                className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Mais controle. Mais eficiência. Mais crescimento.
              </h2>
            </div>

            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((item) => (
                <li key={item.title} className="text-left sm:text-center lg:text-left">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/8 text-[var(--brand-gold-soft)] ring-1 ring-white/10">
                    <item.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Segurança ── */}
        <section
          id="seguranca"
          className="scroll-mt-24 bg-white py-16 sm:py-20"
          aria-labelledby="seguranca-heading"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:px-8">
            <div className="flex justify-center lg:justify-start">
              <div className="inline-flex h-28 w-28 items-center justify-center rounded-3xl bg-[var(--brand-navy-deep)] text-[var(--brand-gold-soft)] shadow-[var(--shadow-elevated)]">
                <ShieldCheck className="h-12 w-12" aria-hidden />
              </div>
            </div>
            <div>
              <h2
                id="seguranca-heading"
                className="font-display text-2xl font-semibold tracking-tight text-[var(--brand-navy-deep)] sm:text-3xl"
              >
                Controle de acesso para sua empresa
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--brand-navy-mid)]/85">
                O TR Control ERP possui controle de usuários, permissões por
                módulo e acesso vinculado à empresa, ajudando a manter cada
                equipe com os recursos adequados às suas responsabilidades.
              </p>
              <ul className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
                {SECURITY_POINTS.map((label) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 text-sm font-medium text-[var(--brand-navy-deep)]"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[var(--brand-gold)]"
                      aria-hidden
                    />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── CTA final ── */}
        <section
          className="scroll-mt-24 border-y border-[var(--brand-navy)]/8 bg-[#f7f8fb] py-16 sm:py-20"
          aria-labelledby="cta-heading"
        >
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
              Pronto para transformar sua gestão?
            </p>
            <h2
              id="cta-heading"
              className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--brand-navy-deep)] sm:text-4xl"
            >
              Conheça o TR Control ERP
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--brand-navy-mid)]/85">
              Solicite acesso e nossa equipe entrará em contato para entender as
              necessidades da sua empresa e apresentar a solução.
            </p>
            <div className="mt-8 flex justify-center">
              <AccessRequestCta
                size="lg"
                showArrow
                className="bg-[var(--brand-navy-deep)] px-8 text-white hover:bg-[var(--brand-navy-mid)]"
              />
            </div>
            <p className="mt-4 text-sm text-[var(--brand-navy-mid)]/70">
              O acesso ao TR Control ERP é liberado após a contratação.
            </p>
          </div>
        </section>

        {/* ── Sobre ── */}
        <section
          id="sobre"
          className="scroll-mt-24 bg-white py-12 sm:py-14"
          aria-labelledby="sobre-heading"
        >
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
            <h2 id="sobre-heading" className="sr-only">
              Sobre
            </h2>
            <p className="text-sm leading-relaxed text-[var(--brand-navy-mid)]/75">
              TR Control ERP é uma solução desenvolvida pela TR Soluções.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[var(--brand-navy-deep)] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-14">
          <div className="space-y-4">
            <BrandLogo variant="on-navy" />
            <p className="text-sm text-white/65">Gestão que impulsiona.</p>
          </div>
          <div className="space-y-1 text-sm text-white/55 lg:text-right">
            <p>© 2026 TR Control ERP. Todos os direitos reservados.</p>
            <p>Uma solução TR Soluções.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
