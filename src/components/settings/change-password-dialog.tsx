"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeOwnPassword } from "@/lib/settings/change-password";
import { cn } from "@/lib/utils";

const fieldClassName = cn(
  "h-10 rounded-lg border-input/80 bg-white/80 text-[13.5px] text-[var(--brand-navy)]",
  "focus-visible:border-[var(--brand-coral)]/45 focus-visible:ring-2 focus-visible:ring-[var(--brand-coral)]/25"
);

const primaryBtn = cn(
  "h-10 min-w-[148px] rounded-lg bg-[var(--brand-coral)] px-5 text-white",
  "hover:bg-[var(--brand-coral)]/88"
);

const EMPTY = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setForm(EMPTY);
    setError(null);
    setSuccess(false);
    setSaving(false);
  }

  function handleOpenChange(next: boolean) {
    if (saving) return;
    onOpenChange(next);
    if (!next) reset();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    setError(null);
    setSuccess(false);
    setSaving(true);

    const result = await changeOwnPassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(true);
    setForm(EMPTY);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Alterar senha"
      description="Informe a senha atual e escolha uma nova senha para a sua conta"
      className="max-w-md"
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Senha atualizada com sucesso.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!success ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                className={fieldClassName}
                value={form.currentPassword}
                disabled={saving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className={fieldClassName}
                value={form.newPassword}
                disabled={saving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className={fieldClassName}
                value={form.confirmPassword}
                disabled={saving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
              />
            </div>
          </>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => handleOpenChange(false)}
          >
            {success ? "Fechar" : "Cancelar"}
          </Button>
          {!success ? (
            <Button type="submit" className={primaryBtn} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Alterar senha
            </Button>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}

type ChangePasswordButtonProps = {
  disabled?: boolean;
};

export function ChangePasswordButton({ disabled }: ChangePasswordButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-lg border-[var(--brand-navy)]/18"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <KeyRound className="h-4 w-4" />
        Alterar senha
      </Button>
      <ChangePasswordDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
