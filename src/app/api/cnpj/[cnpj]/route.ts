import { NextResponse } from "next/server";
import { onlyDigits } from "@/lib/companies/format";
import { CNPJ_MESSAGES } from "@/lib/cnpj/messages";
import { lookupCnpj } from "@/lib/cnpj/service";

type RouteContext = {
  params: Promise<{ cnpj: string }>;
};

/**
 * Proxy interno de consulta CNPJ.
 * O browser chama apenas esta rota; provedores externos ficam no servidor.
 *
 * Principal: BrasilAPI.
 * Fallback: CNPJ.ws pública (somente 403, 5xx ou timeout).
 * Futuro: API oficial Consulta CNPJ do Serpro.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { cnpj: raw } = await context.params;
  const cnpj = onlyDigits(raw ?? "");

  if (cnpj.length !== 14) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid",
        message: CNPJ_MESSAGES.invalid,
      },
      { status: 400 }
    );
  }

  const result = await lookupCnpj(cnpj);

  if (!result.ok) {
    const status =
      result.code === "invalid"
        ? 400
        : result.code === "not_found"
          ? 404
          : result.code === "rate_limited"
            ? 429
            : 503;

    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
