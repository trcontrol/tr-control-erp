"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, ShieldCheck, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import {
  AuthAlert,
  AuthFormCard,
  AuthSplitShell,
  authInputClassName,
  authPrimaryButtonClassName,
} from "@/components/auth/auth-split-shell";

const HIGHLIGHTS = [
  { icon: ListChecks, label: "Processo simples" },
  { icon: ShieldCheck, label: "Acesso protegido" },
  { icon: KeyRound, label: "Retorno ao sistema em poucos passos" },
] as const;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}${ROUTES.resetPassword}`;

    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo }
    );

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <AuthSplitShell
      panelTitle={
        <>
          Recupere seu acesso{" "}
          <span className="text-[var(--brand-gold-soft)]">com segurança.</span>
        </>
      }
      panelDescription="Informe o e-mail utilizado no TR Control ERP e enviaremos as instruções para redefinir sua senha."
      highlights={HIGHLIGHTS}
      backHref={ROUTES.login}
      backLabel="Voltar para o login"
    >
      {success ? (
        <AuthFormCard
          title="Esqueceu sua senha?"
          description="Se existir uma conta com esse e-mail, você receberá um link para redefinir a senha."
          footer={
            <p className="text-center text-sm text-[var(--brand-navy-mid)]/75">
              <Link
                href={ROUTES.login}
                className="font-medium text-[var(--brand-navy-deep)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
              >
                Voltar para o login
              </Link>
            </p>
          }
        >
          <AuthAlert variant="success">
            Se existir uma conta com esse e-mail, você receberá um link para
            redefinir a senha. Verifique sua caixa de entrada.
          </AuthAlert>
        </AuthFormCard>
      ) : (
        <AuthFormCard
          title="Esqueceu sua senha?"
          description="Informe seu e-mail de acesso para receber as instruções de redefinição."
          footer={
            <p className="text-center text-sm text-[var(--brand-navy-mid)]/75">
              Lembrou a senha?{" "}
              <Link
                href={ROUTES.login}
                className="font-medium text-[var(--brand-navy-deep)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
              >
                Entrar
              </Link>
            </p>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <AuthAlert variant="error">{error}</AuthAlert>}
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
                className={authInputClassName}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className={authPrimaryButtonClassName}
            >
              {loading ? "Enviando..." : "Enviar instruções"}
            </Button>
          </form>
        </AuthFormCard>
      )}
    </AuthSplitShell>
  );
}
