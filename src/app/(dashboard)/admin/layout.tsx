import { requirePlatformAdmin } from "@/lib/admin/platform-admin";

/**
 * Todas as rotas /admin/* exigem Super Admin da plataforma.
 * Bloqueio no servidor (404) — não depende do menu.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformAdmin();
  return children;
}
