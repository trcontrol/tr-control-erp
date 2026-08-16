"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserRound, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import {
  clearPasswordResetFlowAction,
  validatePasswordResetFlowAction,
} from "@/lib/auth/password-reset-flow-actions";
import { acceptFlowInviteAction } from "@/lib/users/invite-actions";
import {
  AuthAlert,
  AuthFormCard,
  AuthSplitShell,
  authInputClassName,
  authPrimaryButtonClassName,
} from "@/components/auth/auth-split-shell";

const MIN_PASSWORD_LENGTH = 8;

const HIGHLIGHTS = [
  { icon: Lock, label: "Conta protegida" },
  { icon: UserRound, label: "Acesso individual" },
  { icon: ShieldCheck, label: "Gestão com segurança" },
] as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function ResetShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      panelTitle={
        <>
          Crie uma nova senha{" "}
          <span className="text-[var(--brand-gold-soft)]">para continuar.</span>
        </>
      }
      panelDescription="Escolha uma nova senha para proteger seu acesso ao TR Control ERP."
      highlights={HIGHLIGHTS}
      backHref={ROUTES.login}
      backLabel="Voltar para o login"
    >
      {children}
    </AuthSplitShell>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasPasswordSession, setHasPasswordSession] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const expectedEmailRef = useRef<string | null>(null);
  /** confirm = marcador httpOnly; code = exchange PKCE no browser */
  const flowSourceRef = useRef<"confirm" | "code" | null>(null);

  useEffect(() => {
    let cancelled = false;

    function markReady(hasSession: boolean) {
      if (cancelled) return;
      setHasPasswordSession(hasSession);
      setCheckingSession(false);
    }

    async function establishPasswordSession() {
      const initialUrl = new URL(window.location.href);
      const code = initialUrl.searchParams.get("code");
      const oauthError =
        initialUrl.searchParams.get("error_description") ??
        initialUrl.searchParams.get("error");

      if (oauthError) {
        window.history.replaceState({}, "", ROUTES.resetPassword);
        if (!cancelled) {
          const isPkce =
            /pkce|code verifier/i.test(oauthError) ||
            oauthError === "auth_confirm_error";
          setError(
            isPkce
              ? "Não foi possível validar o link de acesso (sessão Auth incompleta). Solicite um novo convite ou use Esqueci minha senha neste navegador."
              : "O link é inválido ou expirou. Solicite um novo convite ou link de recuperação."
          );
        }
        expectedEmailRef.current = null;
        flowSourceRef.current = null;
        markReady(false);
        return;
      }

      // Remove ?code= ANTES de createClient: detectSessionInUrl faria exchange
      // automático e falharia sem verifier (e-mail disparado no servidor).
      if (code) {
        initialUrl.searchParams.delete("code");
        const clean =
          initialUrl.pathname +
          (initialUrl.searchParams.toString()
            ? `?${initialUrl.searchParams.toString()}`
            : "");
        window.history.replaceState({}, "", clean || ROUTES.resetPassword);
      }

      const supabase = createClient();

      const {
        data: { user: priorUser },
      } = await supabase.auth.getUser();

      // Link com code: identidade vem do exchange — limpa sessão prévia incompatível.
      if (code) {
        if (priorUser) {
          await supabase.auth.signOut();
        }

        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState({}, "", ROUTES.resetPassword);

        if (exchangeError) {
          if (!cancelled) {
            const isPkce = /pkce|code verifier/i.test(exchangeError.message);
            setError(
              isPkce
                ? "Link de acesso incompatível com este navegador (PKCE). Abra o e-mail mais recente ou use Esqueci minha senha neste mesmo navegador."
                : exchangeError.message ||
                    "Não foi possível validar o link de acesso. Solicite um novo convite."
            );
          }
          expectedEmailRef.current = null;
          flowSourceRef.current = null;
          markReady(false);
          return;
        }

        const {
          data: { user: exchangedUser },
        } = await supabase.auth.getUser();

        if (!exchangedUser?.email) {
          expectedEmailRef.current = null;
          flowSourceRef.current = null;
          markReady(false);
          return;
        }

        expectedEmailRef.current = normalizeEmail(exchangedUser.email);
        flowSourceRef.current = "code";
        markReady(true);
        return;
      }

      // Sem ?code: exige marcador httpOnly de /auth/confirm + sessão do mesmo e-mail.
      // Sessão pré-existente sozinha NÃO habilita o formulário.
      const flow = await validatePasswordResetFlowAction();

      if (flow.error || !flow.data) {
        if (!cancelled) {
          setError(
            flow.error?.message ||
              "Link inválido, expirado ou fluxo não autenticado. Abra novamente o link do e-mail."
          );
        }
        expectedEmailRef.current = null;
        flowSourceRef.current = null;
        markReady(false);
        return;
      }

      expectedEmailRef.current = flow.data.email;
      flowSourceRef.current = "confirm";
      window.history.replaceState({}, "", ROUTES.resetPassword);
      markReady(true);
    }

    void establishPasswordSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function assertFlowStillValid(expectedEmail: string) {
    if (flowSourceRef.current === "confirm") {
      const flow = await validatePasswordResetFlowAction();
      if (
        flow.error ||
        !flow.data ||
        flow.data.email !== expectedEmail
      ) {
        return (
          flow.error?.message ||
          "A sessão atual não corresponde ao link de acesso. Abra novamente o link do e-mail."
        );
      }
      return null;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email || normalizeEmail(user.email) !== expectedEmail) {
      return "A sessão atual não corresponde ao link de acesso. Abra novamente o link do e-mail.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    const expectedEmail = expectedEmailRef.current;
    if (!expectedEmail || !flowSourceRef.current) {
      setError(
        "Identidade do link não validada. Abra novamente o link do convite ou de recuperação."
      );
      return;
    }

    setLoading(true);

    const flowError = await assertFlowStillValid(expectedEmail);
    if (flowError) {
      setError(flowError);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const {
      data: { user: sessionUser },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !sessionUser?.email) {
      setError(
        "Sessão de acesso ausente ou expirada. Abra novamente o link do convite ou solicite um novo."
      );
      setLoading(false);
      return;
    }

    if (normalizeEmail(sessionUser.email) !== expectedEmail) {
      setError(
        "A sessão atual não corresponde ao link de acesso. Feche outras abas logadas, saia da conta e abra o link do e-mail novamente."
      );
      setLoading(false);
      return;
    }

    if (!passwordSaved) {
      const { error: authError } = await supabase.auth.updateUser({
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const {
        data: { user: afterUpdateUser },
        error: afterUpdateError,
      } = await supabase.auth.getUser();

      if (
        afterUpdateError ||
        !afterUpdateUser?.email ||
        normalizeEmail(afterUpdateUser.email) !== expectedEmail
      ) {
        setError(
          "Senha pode ter sido salva, mas a sessão não permaneceu na conta do link. Abra o convite novamente."
        );
        setLoading(false);
        return;
      }

      await supabase.auth.getSession();
      setPasswordSaved(true);
    } else {
      const retryError = await assertFlowStillValid(expectedEmail);
      if (retryError) {
        setError(retryError);
        setLoading(false);
        return;
      }
      await supabase.auth.getSession();
    }

    // Convite: aceita SOMENTE o invite_id do marcador tr_pw_flow.
    // Recuperação sem convite: no-op (accepted: 0).
    const acceptResult = await acceptFlowInviteAction();

    if (acceptResult.error) {
      setError(
        `Senha salva, mas o vínculo com a empresa falhou: ${acceptResult.error.message}. ` +
          "Clique em salvar novamente para tentar vincular, ou peça o reenvio do convite."
      );
      setLoading(false);
      return;
    }

    const {
      data: { user: finalUser },
    } = await supabase.auth.getUser();

    if (
      !finalUser?.email ||
      normalizeEmail(finalUser.email) !== expectedEmail
    ) {
      setError(
        "Senha salva, mas a sessão deixou de corresponder à conta do link. Faça login com o e-mail do convite."
      );
      setLoading(false);
      return;
    }

    await clearPasswordResetFlowAction();
    await supabase.auth.signOut();
    setSuccess(true);
    setLoading(false);

    window.setTimeout(() => {
      router.push(ROUTES.login);
      router.refresh();
    }, 2000);
  }

  if (checkingSession) {
    return (
      <ResetShell>
        <AuthFormCard
          title="Redefinir senha"
          description="Validando o link de acesso à sua conta."
        >
          <p className="text-center text-sm text-[var(--brand-navy-mid)]/70">
            Validando link de acesso...
          </p>
        </AuthFormCard>
      </ResetShell>
    );
  }

  if (success) {
    return (
      <ResetShell>
        <AuthFormCard
          title="Senha definida"
          description="Sua senha foi salva e o acesso à empresa foi vinculado. Use-a para entrar na sua conta."
          footer={
            <Button asChild className={authPrimaryButtonClassName}>
              <Link href={ROUTES.login}>Ir para o login</Link>
            </Button>
          }
        >
          <AuthAlert variant="success">
            Redirecionando para o login...
          </AuthAlert>
        </AuthFormCard>
      </ResetShell>
    );
  }

  if (!hasPasswordSession) {
    return (
      <ResetShell>
        <AuthFormCard
          title="Link inválido ou expirado"
          description="Peça ao administrador para reenviar o convite, ou solicite um novo link de recuperação."
          footer={
            <div className="space-y-4">
              <Button asChild className={authPrimaryButtonClassName}>
                <Link href={ROUTES.forgotPassword}>Solicitar novo link</Link>
              </Button>
              <p className="text-center text-sm text-[var(--brand-navy-mid)]/75">
                <Link
                  href={ROUTES.login}
                  className="font-medium text-[var(--brand-navy-deep)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
                >
                  Voltar para o login
                </Link>
              </p>
            </div>
          }
        >
          {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
        </AuthFormCard>
      </ResetShell>
    );
  }

  return (
    <ResetShell>
      <AuthFormCard
        title="Redefinir senha"
        description="Defina uma nova senha para sua conta."
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <AuthAlert variant="error">{error}</AuthAlert>}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[var(--brand-navy-deep)]">
              Nova senha
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              required
              disabled={passwordSaved || loading}
              className={authInputClassName}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-[var(--brand-navy-deep)]"
            >
              Confirmar nova senha
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              required
              disabled={passwordSaved || loading}
              className={authInputClassName}
            />
          </div>
          <Button
            type="submit"
            className={authPrimaryButtonClassName}
            disabled={loading}
          >
            {loading
              ? "Salvando..."
              : passwordSaved
                ? "Tentar vincular empresa novamente"
                : "Salvar nova senha"}
          </Button>
        </form>
      </AuthFormCard>
    </ResetShell>
  );
}
