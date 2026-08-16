"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { checkPlatformAdminAction } from "@/lib/admin/platform-admin-actions";

type AppShellProps = {
  userEmail?: string;
  isPlatformAdmin?: boolean;
  banner?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  userEmail,
  isPlatformAdmin = false,
  banner,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState(isPlatformAdmin);

  useEffect(() => {
    setPlatformAdmin(isPlatformAdmin);
  }, [isPlatformAdmin]);

  // Refresh after navigation — layout may be stale.
  // Only apply confirmed results; never regress SSR true on recheck failure.
  useEffect(() => {
    let cancelled = false;

    void checkPlatformAdminAction()
      .then((result) => {
        if (cancelled || !result.ok) return;
        setPlatformAdmin(result.allowed);
      })
      .catch(() => {
        // Preserve current state (e.g. SSR-confirmed Super Admin).
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <div className="bg-app-shell flex min-h-screen overflow-x-clip">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isPlatformAdmin={platformAdmin}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <Header
          userEmail={userEmail}
          onMenuClick={() => setMobileOpen(true)}
        />
        {banner}
        <main className="min-w-0 flex-1 overflow-x-clip overflow-y-auto px-3 py-4 sm:px-6 sm:py-5 md:px-8 md:py-7 lg:px-10">
          <div className="mx-auto w-full min-w-0 max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
