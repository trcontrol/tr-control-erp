"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import {
  clearPasswordResetFlowAction,
  validatePasswordResetFlowAction,
} from "@/lib/auth/password-reset-flow-actions";
import { acceptFlowInviteAction } from "@/lib/users/invite-actions";

const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">
            Validando link de acesso...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Senha definida</CardTitle>
          <CardDescription>
            Sua senha foi salva e o acesso à empresa foi vinculado. Use-a para
            entrar na sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-primary/10 p-3 text-sm text-foreground">
            Redirecionando para o login...
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href={ROUTES.login}>Ir para o login</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!hasPasswordSession) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Link inválido ou expirado</CardTitle>
          <CardDescription>
            Peça ao administrador para reenviar o convite, ou solicite um novo
            link de recuperação
          </CardDescription>
        </CardHeader>
        {error ? (
          <CardContent>
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          </CardContent>
        ) : null}
        <CardFooter className="flex flex-col gap-4">
          <Button asChild className="w-full">
            <Link href={ROUTES.forgotPassword}>Solicitar novo link</Link>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href={ROUTES.login} className="text-primary hover:underline">
              Voltar para o login
            </Link>
          </p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Criar senha de acesso</CardTitle>
        <CardDescription>
          Defina a senha do seu primeiro acesso ou da recuperação de conta
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              required
              disabled={passwordSaved || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              required
              disabled={passwordSaved || loading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Salvando..."
              : passwordSaved
                ? "Tentar vincular empresa novamente"
                : "Salvar senha"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
