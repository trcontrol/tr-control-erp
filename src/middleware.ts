import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

/** Rotas usadas só pelo edge middleware — locais para evitar recompilação Edge ao editar constants.ts */
const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  authCallback: "/api/auth/callback",
  authCallbackPage: "/auth/callback",
  authConfirm: "/auth/confirm",
} as const;

const PUBLIC_ROUTES = [
  ROUTES.home,
  ROUTES.login,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.authCallback,
  ROUTES.authCallbackPage,
  ROUTES.authConfirm,
] as const;

/** Rotas de auth onde usuário logado deve ir para o dashboard */
const AUTH_ROUTES = [ROUTES.login, ROUTES.forgotPassword] as const;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cadastro público bloqueado: qualquer acesso a /register vai para o login.
  if (pathname === ROUTES.register) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    url.search = "";
    return NextResponse.redirect(url);
  }

  const { supabase, supabaseResponse } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.includes(
    pathname as (typeof PUBLIC_ROUTES)[number]
  );
  const isAuthRoute = AUTH_ROUTES.includes(
    pathname as (typeof AUTH_ROUTES)[number]
  );

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.dashboard;
    return NextResponse.redirect(url);
  }

  // /admin/*: exige autenticação (já coberta) + Super Admin da plataforma.
  // Layout também chama requirePlatformAdmin() (404). Aqui falha fechada cedo.
  if (user && pathname.startsWith("/admin")) {
    const { data: isAdmin, error: adminError } = await supabase.rpc(
      "is_platform_admin"
    );

    let allowed = !adminError && isAdmin === true;

    if (!allowed) {
      const email = user.email?.trim().toLowerCase() ?? "";
      const envEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      allowed = Boolean(email && envEmails.includes(email));
    }

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.dashboard;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
