"use client";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  APP_NAME,
  getAccessRequestWhatsAppUrl,
  ROUTES,
} from "@/lib/constants";

export default function HomePage() {
  const accessRequestUrl = getAccessRequestWhatsAppUrl();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">{APP_NAME}</span>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href={ROUTES.login}>Entrar</Link>
            </Button>
            {accessRequestUrl ? (
              <Button asChild>
                <a
                  href={accessRequestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Solicitar acesso
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button asChild>
                <Link href={ROUTES.login}>
                  Solicitar acesso
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Gestão empresarial{" "}
            <span className="text-primary">multiempresa</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            O {APP_NAME} centraliza finanças, estoque, vendas e equipes em uma
            plataforma SaaS segura e escalável para múltiplas empresas.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            O acesso ao TR Control ERP é liberado após a contratação.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            {accessRequestUrl ? (
              <Button size="lg" asChild>
                <a
                  href={accessRequestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Solicitar acesso
                </a>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href={ROUTES.login}>Solicitar acesso</Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link href={ROUTES.login}>Entrar</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
