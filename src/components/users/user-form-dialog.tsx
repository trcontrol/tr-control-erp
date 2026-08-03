"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ROLE_FORM_OPTIONS,
  STATUS_FORM_OPTIONS,
  type MockUser,
  type MockUserInput,
  type MockUserRole,
  type MockUserStatus,
} from "@/components/users/mock-users";

type UserFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  user?: MockUser | null;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MockUserInput) => boolean;
};

const EMPTY_FORM: MockUserInput = {
  name: "",
  email: "",
  role: "member",
  status: "pending",
};

export function UserFormDialog({
  open,
  mode,
  user,
  error,
  onOpenChange,
  onSubmit,
}: UserFormDialogProps) {
  const [form, setForm] = useState<MockUserInput>(EMPTY_FORM);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setLocalError(null);

    if (mode === "edit" && user) {
      setForm({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      });
      return;
    }

    setForm(EMPTY_FORM);
  }, [open, mode, user]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email) {
      setLocalError("Preencha nome completo e e-mail.");
      return;
    }

    setLocalError(null);
    const accepted = onSubmit({
      name,
      email,
      role: form.role,
      status: form.status,
    });

    if (!accepted) return;
    onOpenChange(false);
  }

  const displayError = localError ?? error ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Novo usuário" : "Editar usuário"}
      description={
        mode === "create"
          ? "Cadastre um usuário na lista local da empresa"
          : "Atualize os dados do usuário selecionado"
      }
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-name">Nome completo</Label>
          <Input
            id="user-name"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Ex.: Ana Souza"
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-email">E-mail</Label>
          <Input
            id="user-email"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="Ex.: ana.souza@empresa.com"
            autoComplete="email"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="user-role">Perfil</Label>
            <Select
              id="user-role"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value as MockUserRole,
                }))
              }
            >
              {ROLE_FORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-status">Status</Label>
            <Select
              id="user-status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as MockUserStatus,
                }))
              }
            >
              {STATUS_FORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {displayError ? (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {displayError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit">
            {mode === "create" ? "Adicionar usuário" : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
