/**
 * Troca de senha do usuário JÁ autenticado (Minha Conta).
 * Isolado de forgot/reset/invite/tr_pw_flow.
 *
 * Fluxo:
 * 1) getUser() → e-mail da sessão
 * 2) signInWithPassword(email, senhaAtual) → prova de posse (sem Admin API)
 * 3) updateUser({ password: nova }) → grava na mesma sessão Auth
 */
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export type ChangeOwnPasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangeOwnPasswordResult =
  | { ok: true }
  | { ok: false; message: string };

function isInvalidCredentialsError(message: string) {
  return /invalid login credentials|invalid credentials|email or password|senha|password/i.test(
    message
  );
}

export async function changeOwnPassword(
  input: ChangeOwnPasswordInput
): Promise<ChangeOwnPasswordResult> {
  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword;
  const confirmPassword = input.confirmPassword;

  if (!currentPassword) {
    return { ok: false, message: "Informe a senha atual." };
  }

  if (!newPassword) {
    return { ok: false, message: "Informe a nova senha." };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      message: "A confirmação deve ser igual à nova senha.",
    };
  }

  if (newPassword === currentPassword) {
    return {
      ok: false,
      message: "A nova senha deve ser diferente da senha atual.",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return {
      ok: false,
      message: "Sessão autenticada ausente. Faça login novamente.",
    };
  }

  const email = user.email.trim().toLowerCase();

  // Reautenticação com a mesma conta: valida senha atual.
  // Credenciais inválidas não devem derrubar a sessão existente (Auth retorna erro).
  const { data: reauthData, error: reauthError } =
    await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

  if (reauthError) {
    if (isInvalidCredentialsError(reauthError.message)) {
      return {
        ok: false,
        message: "A senha atual informada está incorreta.",
      };
    }
    if (/aal|mfa|reauthentication|insufficient/i.test(reauthError.message)) {
      return {
        ok: false,
        message:
          "Não foi possível validar a senha atual com as configurações de segurança da conta. Tente novamente ou use Esqueci minha senha.",
      };
    }
    return {
      ok: false,
      message: "Não foi possível validar a senha atual. Tente novamente.",
    };
  }

  if (!reauthData.user || reauthData.user.id !== user.id) {
    return {
      ok: false,
      message: "Não foi possível confirmar a identidade da sessão.",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    if (/aal|mfa|reauthentication|insufficient/i.test(updateError.message)) {
      return {
        ok: false,
        message:
          "A alteração de senha exige uma etapa adicional de segurança não disponível nesta tela. Use Esqueci minha senha ou contate o suporte.",
      };
    }
    if (/same password|should be different/i.test(updateError.message)) {
      return {
        ok: false,
        message: "A nova senha deve ser diferente da senha atual.",
      };
    }
    return {
      ok: false,
      message: "Não foi possível atualizar a senha. Tente novamente.",
    };
  }

  return { ok: true };
}
