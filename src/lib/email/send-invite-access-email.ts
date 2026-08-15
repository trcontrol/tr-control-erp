import { Resend } from "resend";
import { APP_NAME } from "@/lib/constants";

/**
 * Envio server-side do link de acesso (convite / recovery) via Resend.
 * NÃO usar templates Auth PKCE do Supabase como fallback.
 */

export type InviteAccessEmailPayload = {
  to: string;
  fullName: string;
  companyName: string;
  /** URL completa /auth/confirm?token_hash=...&type=...&next=/reset-password */
  confirmUrl: string;
  mode: "invite" | "recovery";
};

function getResendEnv():
  | { apiKey: string; fromEmail: string }
  | { error: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || apiKey.startsWith("your-")) {
    return {
      error:
        "RESEND_API_KEY ausente ou inválida no servidor. Configure a chave Resend (somente server-side).",
    };
  }

  if (!fromEmail || !fromEmail.includes("@") || fromEmail.startsWith("your-")) {
    return {
      error:
        "RESEND_FROM_EMAIL ausente ou inválido no servidor. Use um remetente verificado no Resend.",
    };
  }

  return { apiKey, fromEmail };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInviteEmailContent(payload: InviteAccessEmailPayload) {
  const displayName = payload.fullName.trim() || payload.to;
  const company = payload.companyName.trim() || "sua empresa";
  const isRecovery = payload.mode === "recovery";

  const subject = isRecovery
    ? `Defina sua senha de acesso ao ${APP_NAME}`
    : `Seu acesso ao ${APP_NAME} está pronto`;

  const intro = isRecovery
    ? `Foi liberado um link para você definir (ou redefinir) a senha e acessar a empresa ${company} no ${APP_NAME}.`
    : `Foi criado um acesso para você na empresa ${company} no ${APP_NAME}.`;

  const text = [
    `Olá, ${displayName}.`,
    "",
    intro,
    "",
    "Crie sua senha e acesse pelo link abaixo:",
    payload.confirmUrl,
    "",
    "Este link é pessoal e não deve ser compartilhado. Ele pode expirar por segurança.",
    "",
    `${APP_NAME} — TR Soluções`,
  ].join("\n");

  const safeName = escapeHtml(displayName);
  const safeCompany = escapeHtml(company);
  const safeUrl = escapeHtml(payload.confirmUrl);
  const safeIntro = escapeHtml(intro);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a2332;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#0f2744;color:#ffffff;padding:20px 28px;font-size:18px;font-weight:600;">
              ${escapeHtml(APP_NAME)}
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Olá, <strong>${safeName}</strong>.</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">${safeIntro}</p>
              <p style="margin:0 0 24px;">
                <a href="${safeUrl}" style="display:inline-block;background:#e85d4c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:600;">
                  Criar senha e acessar
                </a>
              </p>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#64748b;">
                Se o botão não funcionar, copie e cole este link no navegador:<br />
                <a href="${safeUrl}" style="color:#0f2744;word-break:break-all;">${safeUrl}</a>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
                Este link é pessoal e não deve ser compartilhado. Ele pode expirar por segurança.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
              ${escapeHtml(APP_NAME)} · TR Soluções<br />
              Empresa: ${safeCompany}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

export async function sendInviteAccessEmail(
  payload: InviteAccessEmailPayload
): Promise<{ ok: true } | { error: string }> {
  const env = getResendEnv();
  if ("error" in env) {
    return { error: env.error };
  }

  const to = payload.to.trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return { error: "Destinatário de e-mail inválido." };
  }

  if (!payload.confirmUrl.trim().startsWith("http")) {
    return { error: "URL de acesso inválida para o e-mail." };
  }

  const { subject, text, html } = buildInviteEmailContent(payload);

  try {
    const resend = new Resend(env.apiKey);
    const { data, error } = await resend.emails.send({
      from: env.fromEmail,
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      return {
        error: `Falha ao enviar e-mail pelo Resend: ${error.message}`,
      };
    }

    if (!data?.id) {
      return {
        error: "Resend não confirmou o envio do e-mail (id ausente).",
      };
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro inesperado no envio Resend.";
    return { error: `Falha ao enviar e-mail pelo Resend: ${message}` };
  }
}
