import { RequireModule } from "@/components/auth/require-module";
import { PERMISSION_MODULES } from "@/lib/users/permissions";

export default async function ModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireModule module={PERMISSION_MODULES.reports}>
      {children}
    </RequireModule>
  );
}
