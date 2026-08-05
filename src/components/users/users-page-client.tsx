"use client";

import { UsersBoard } from "@/components/users/users-board";
import { UsersPageShell } from "@/components/users/users-page-shell";

export function UsersPageClient() {
  return (
    <UsersPageShell
      title="Usuários"
      description="Usuários vinculados à empresa ativa"
    >
      {({ companyId, companyName }) => (
        <UsersBoard companyId={companyId} companyName={companyName} />
      )}
    </UsersPageShell>
  );
}
