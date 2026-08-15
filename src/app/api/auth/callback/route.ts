import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { ROUTES } from "@/lib/constants";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return ROUTES.resetPassword;
  }

  return next;
}

/**
 * Callback PKCE (code no query).
 * Convites com tokens no hash devem usar /auth/callback (página client).
 * Sem code: encaminha para a página client preservando `next` (e o browser
 * pode manter o fragmento # em alguns casos).
 *
 * Não aceita convites em massa — aceite só via fluxo tr_pw_flow + invite_id.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"));

  if (!code) {
    const pageUrl = new URL(ROUTES.authCallbackPage, origin);
    pageUrl.searchParams.set("next", next);
    return NextResponse.redirect(pageUrl);
  }

  const { url, publishableKey } = getSupabaseEnv();
  const redirectResponse = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const pageUrl = new URL(ROUTES.authCallbackPage, origin);
    pageUrl.searchParams.set("next", next);
    return NextResponse.redirect(pageUrl);
  }

  return redirectResponse;
}
