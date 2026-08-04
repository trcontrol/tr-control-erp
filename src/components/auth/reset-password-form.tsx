"use client";

import { useEffect, useState } from "react";
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

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function markReady(hasSession: boolean) {
      if (cancelled) return;
      setHasRecoverySession(hasSession);
      setCheckingSession(false);
    }

    async function establishRecoverySession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const oauthError =
        url.searchParams.get("error_description") ??
        url.searchParams.get("error");

      if (oauthError) {
        window.history.replaceState({}, "", ROUTES.resetPassword);
        if (!cancelled) {
          setError(
            "O link de recuperação é inválido ou expirou. Solicite um novo link."
          );
        }
        markReady(false);
        return;
      }

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState({}, "", ROUTES.resetPassword);

        if (exchangeError) {
          markReady(false);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      markReady(!!user);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        markReady(!!session);
        return;
      }

      if (event === "SIGNED_IN" && session) {
        markReady(true);
      }
    });

    void establishRecoverySession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

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

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

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
            Validando link de recuperação...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Senha atualizada</CardTitle>
          <CardDescription>
            Sua nova senha foi salva com sucesso
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

  if (!hasRecoverySession) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Link inválido ou expirado</CardTitle>
          <CardDescription>
            Solicite um novo link para redefinir sua senha
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
        <CardTitle>Nova senha</CardTitle>
        <CardDescription>Defina uma nova senha para sua conta</CardDescription>
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
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
