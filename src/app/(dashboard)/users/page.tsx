import { UsersPageClient } from "@/components/users/users-page-client";

export const metadata = {
  title: "Usuários",
};

/**
 * Rota do menu lateral: ROUTES.users → "/users"
 * Arquivo efetivo: src/app/(dashboard)/users/page.tsx
 *
 * O conteúdo interativo fica em UsersPageClient para não passar
 * funções (render props) de Server Component para Client Component.
 */
export default function UsersPage() {
  return <UsersPageClient />;
}
