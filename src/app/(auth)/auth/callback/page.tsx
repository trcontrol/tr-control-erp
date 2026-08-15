"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return ROUTES.resetPassword;
  }
  return next;
}

/**
 * Callback client-side para convites (type=invite) e codes PKCE.
 * Hash (#access_token) só é lido no browser — por isso não usa a API route.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Validando convite e preparando acesso...");

  useEffect(() => {
    let cancelled = false;

    async function waitForSession(
      supabase: ReturnType<typeof createClient>,
      timeoutMs = 4000
    ) {
      const {
        data: { session: existing },
      } = await supabase.auth.getSession();
      if (existing) return existing;

      return new Promise<Awaited<
        ReturnType<typeof supabase.auth.getSession>
      >["data"]["session"]>((resolve) => {
        const timer = window.setTimeout(() => {
          subscription.unsubscribe();
          void supabase.auth.getSession().then(({ data }) => resolve(data.session));
        }, timeoutMs);

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (
            session &&
            (event === "SIGNED_IN" ||
              event === "INITIAL_SESSION" ||
              event === "TOKEN_REFRESHED" ||
              event === "PASSWORD_RECOVERY")
          ) {
            window.clearTimeout(timer);
            subscription.unsubscribe();
            resolve(session);
          }
        });
      });
    }

    async function run() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const next = getSafeNextPath(url.searchParams.get("next"));
      const code = url.searchParams.get("code");
      const oauthError =
        url.searchParams.get("error_description") ??
        url.searchParams.get("error");

      if (oauthError) {
        if (!cancelled) {
          setMessage("Link inválido ou expirado.");
        }
        router.replace(`${ROUTES.login}?error=auth_callback_error`);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) {
            setMessage("Não foi possível validar o código de acesso.");
          }
          router.replace(`${ROUTES.login}?error=auth_callback_error`);
          return;
        }
        // Garante sessão/cookies SSR antes do aceite e do redirect.
        await supabase.auth.getSession();
      } else {
        // Convite implícito: tokens no hash (#access_token&type=invite)
        if (!cancelled) {
          setMessage("Confirmando convite...");
        }
        const session = await waitForSession(supabase);
        if (!session) {
          if (!cancelled) {
            setMessage("Sessão de convite não encontrada.");
          }
          router.replace(`${ROUTES.login}?error=auth_callback_error`);
          return;
        }
        await supabase.auth.getSession();
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`${ROUTES.login}?error=auth_callback_error`);
        return;
      }

      // Aceite de convite de empresa ocorre apenas no fluxo tr_pw_flow
      // (invite_id no /auth/confirm → reset-password → acceptFlowInviteAction).

      // Limpa code/hash da barra de endereço antes de ir à senha.
      window.history.replaceState({}, "", next);
      router.replace(next);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Quase lá</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Em seguida você poderá definir sua senha de acesso.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
