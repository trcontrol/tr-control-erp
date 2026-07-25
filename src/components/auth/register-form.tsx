"use client";

import { useState } from "react";
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const authError = error as {
      message?: string;
      code?: string;
      status?: number;
    };

    if (authError.message) {
      const details = [
        authError.code ? `código: ${authError.code}` : null,
        authError.status ? `status: ${authError.status}` : null,
      ].filter(Boolean);

      return details.length > 0
        ? `${authError.message} (${details.join(", ")})`
        : authError.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Erro inesperado ao criar a conta. Tente novamente.";
}

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${ROUTES.authCallback}?next=${encodeURIComponent(ROUTES.dashboard)}`,
          data: {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
            company_slug: slugify(companyName),
          },
        },
      });

      if (authError) {
        setError(getErrorMessage(authError));
        return;
      }

      if (!data.user) {
        setError(
          "O Supabase não retornou o usuário criado. Verifique as configurações de Auth."
        );
        return;
      }

      // Conta já existente: signUp pode retornar user sem identities
      if (
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        setError(
          "Já existe uma conta com este e-mail. Faça login ou recupere a senha."
        );
        return;
      }

      if (!data.session) {
        setSuccessMessage(
          "Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro antes de entrar."
        );
        return;
      }

      setSuccessMessage("Conta criada com sucesso! Redirecionando...");
      router.push(ROUTES.dashboard);
      router.refresh();
    } catch (err) {
      console.error("Erro no cadastro:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>
          Cadastre-se e crie sua empresa no TR Control ERP
        </CardDescription>
      </CardHeader>
      {successMessage ? (
        <CardContent className="space-y-4">
          <div className="rounded-md bg-primary/10 p-3 text-sm text-foreground">
            {successMessage}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            <Link href={ROUTES.login} className="text-primary hover:underline">
              Ir para o login
            </Link>
          </p>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da empresa</Label>
              <Input
                id="companyName"
                placeholder="Minha Empresa Ltda"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href={ROUTES.login} className="text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
