import { requireModuleAccess } from "@/lib/plans/require-module-access";
import type { PermissionModuleId } from "@/lib/users/permissions";

/** Server Component: bloqueia a página se plano/permissão não permitir o módulo. */
export async function RequireModule({
  module,
  children,
}: {
  module: PermissionModuleId;
  children: React.ReactNode;
}) {
  await requireModuleAccess(module);
  return children;
}
